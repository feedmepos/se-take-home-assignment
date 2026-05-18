import 'dart:async';
import 'package:uuid/uuid.dart';
import '../constants/app_sizes.dart';
import '../core/logger.dart';
import '../models/order.dart';
import '../models/bot.dart';
import '../models/order_system_state.dart';

/// Core domain service — owns **all** mutable state for the order system.
///
/// Design decisions (Senior-level rationale):
///
/// 1. **Single writer** — all mutations happen inside this class; external
///    callers receive *immutable* [OrderSystemState] snapshots via a stream.
///    This eliminates an entire class of race-condition bugs.
///
/// 2. **Timer-safe bot removal** — when a bot is destroyed mid-processing,
///    its timer is cancelled *before* the order is returned to the queue,
///    preventing double-completion.
///
/// 3. **Telemetry hooks** — every state-changing operation is logged through
///    [AppLogger] so that production builds can wire Sentry/Crashlytics
///    without touching business logic.
///
/// 4. **Testability** — the constructor accepts optional [AppLogger] and a
///    `processingDuration` override so unit tests can run without sleeping
///    for 10 real seconds.
class OrderService {
  static const String _tag = 'OrderService';

  final AppLogger _logger;
  final Duration _processingDuration;
  final _uuid = const Uuid();

  // ── Mutable state (private) ────────────────────────────────────────
  final List<Order> _pendingOrders = [];
  final List<Order> _completedOrders = [];
  final List<Bot> _bots = [];
  final Map<String, Timer> _botTimers = {};
  final Map<String, (int, OrderType)> _orderMetadata = {};

  int _orderCounter = 0;
  int _botCounter = 0;
  bool _disposed = false;

  // ── Reactive output ────────────────────────────────────────────────
  final _stateController = StreamController<OrderSystemState>.broadcast();

  /// Subscribe to receive immutable snapshots whenever state changes.
  Stream<OrderSystemState> get stateStream => _stateController.stream;

  // ── Read-only accessors (kept for backward-compat with provider) ───
  List<Order> get pendingOrders => List.unmodifiable(_pendingOrders);
  List<Order> get completedOrders => List.unmodifiable(_completedOrders);
  List<Bot> get bots => List.unmodifiable(_bots);

  // Legacy streams kept for existing provider wiring
  Stream<void> get ordersStream => stateStream.map((_) {});
  Stream<void> get botsStream => stateStream.map((_) {});

  OrderService({
    AppLogger? logger,
    Duration? processingDuration,
  })  : _logger = logger ?? const ConsoleLogger(),
        _processingDuration = processingDuration ??
            const Duration(seconds: AppSizes.processingTimeSeconds);

  // ── Commands ───────────────────────────────────────────────────────

  /// Creates a new order with the specified [type] and enqueues it.
  Order createOrder(OrderType type) {
    _orderCounter++;
    final order = Order(
      id: _uuid.v4(),
      orderNumber: _orderCounter,
      type: type,
      createdAt: DateTime.now(),
    );

    _addOrderToPendingQueue(order);
    _logger.info(_tag,
        'Order #${order.orderNumber} created (${type.name}). '
        'Queue size: ${_pendingOrders.length}');

    _assignOrdersToIdleBots();
    _emitState();
    return order;
  }

  /// Spawns a new bot and immediately tries to pick up a pending order.
  Bot createBot() {
    _botCounter++;
    final bot = Bot(
      id: _uuid.v4(),
      botNumber: _botCounter,
      createdAt: DateTime.now(),
    );

    _bots.add(bot);
    _logger.info(_tag, 'Bot #${bot.botNumber} created. Total bots: ${_bots.length}');

    _processNextOrder(bot);
    _emitState();
    return bot;
  }

  /// Removes the **newest** bot (LIFO).
  ///
  /// If that bot was mid-processing, its timer is cancelled and the order
  /// is returned to the queue at its correct priority position.
  bool removeBot() {
    if (_bots.isEmpty) {
      _logger.warn(_tag, 'removeBot called with no bots');
      return false;
    }

    final bot = _bots.removeLast();

    // Cancel timer *first* to prevent the completion callback from firing
    // after the bot has already been removed (race-condition guard).
    _botTimers[bot.id]?.cancel();
    _botTimers.remove(bot.id);

    if (bot.currentOrderId != null) {
      _returnOrderToQueue(bot.currentOrderId!);
      _logger.info(_tag,
          'Bot #${bot.botNumber} removed mid-processing. '
          'Order returned to queue.');
    } else {
      _logger.info(_tag, 'Bot #${bot.botNumber} removed (was idle).');
    }

    _emitState();
    return true;
  }

  /// Clears all completed orders (UI housekeeping).
  void clearCompletedOrders() {
    final count = _completedOrders.length;
    _completedOrders.clear();
    _logger.info(_tag, 'Cleared $count completed orders');
    _emitState();
  }

  /// Returns the [Order] currently being processed by [botId], or `null`.
  Order? getOrderForBot(String botId) {
    final idx = _bots.indexWhere((b) => b.id == botId);
    if (idx == -1) return null;
    final bot = _bots[idx];
    if (bot.currentOrderId == null) return null;

    final metadata = _orderMetadata[bot.currentOrderId];
    if (metadata == null) return null;

    return Order(
      id: bot.currentOrderId!,
      orderNumber: metadata.$1,
      type: metadata.$2,
      status: OrderStatus.processing,
      createdAt: DateTime.now(),
    );
  }

  /// Builds and returns the current immutable state snapshot.
  OrderSystemState get currentState {
    final botOrders = <String, Order>{};
    for (final bot in _bots) {
      final order = getOrderForBot(bot.id);
      if (order != null) botOrders[bot.id] = order;
    }
    return OrderSystemState(
      pendingOrders: List.unmodifiable(_pendingOrders),
      completedOrders: List.unmodifiable(_completedOrders),
      bots: List.unmodifiable(_bots),
      botCurrentOrders: Map.unmodifiable(botOrders),
    );
  }

  // ── Internal logic ─────────────────────────────────────────────────

  /// Priority queue insertion: VIP orders go after existing VIPs but
  /// before all normal orders.
  void _addOrderToPendingQueue(Order order) {
    if (order.type == OrderType.vip) {
      int insertIndex = 0;
      for (int i = 0; i < _pendingOrders.length; i++) {
        if (_pendingOrders[i].type == OrderType.vip) {
          insertIndex = i + 1;
        } else {
          break;
        }
      }
      _pendingOrders.insert(insertIndex, order);
    } else {
      _pendingOrders.add(order);
    }
  }

  void _returnOrderToQueue(String orderId) {
    final metadata = _orderMetadata[orderId];
    if (metadata == null) {
      _logger.warn(_tag, 'Attempted to return unknown order $orderId');
      return;
    }

    final order = Order(
      id: orderId,
      orderNumber: metadata.$1,
      type: metadata.$2,
      createdAt: DateTime.now(),
    );

    _addOrderToPendingQueue(order);
  }

  void _processNextOrder(Bot bot) {
    if (_pendingOrders.isEmpty) {
      _updateBot(bot.id, BotStatus.idle, null);
      return;
    }

    final order = _pendingOrders.removeAt(0);
    _updateBot(bot.id, BotStatus.processing, order.id);
    _orderMetadata[order.id] = (order.orderNumber, order.type);

    _logger.info(_tag,
        'Bot #${bot.botNumber} ▸ processing Order #${order.orderNumber}');

    _botTimers[bot.id] = Timer(
      _processingDuration,
      () => _completeOrder(bot, order),
    );
  }

  void _completeOrder(Bot bot, Order order) {
    // Guard: if the service was disposed between timer start and fire,
    // silently bail out to prevent stream errors.
    if (_disposed) return;

    _botTimers.remove(bot.id);

    final completedOrder = order.copyWith(status: OrderStatus.completed);
    _completedOrders.insert(0, completedOrder);
    _orderMetadata.remove(order.id);

    _logger.info(_tag,
        'Order #${order.orderNumber} completed by Bot #${bot.botNumber}. '
        'Total completed: ${_completedOrders.length}');

    _processNextOrder(bot);
    _emitState();
  }

  void _updateBot(String botId, BotStatus status, String? currentOrderId) {
    final index = _bots.indexWhere((b) => b.id == botId);
    if (index != -1) {
      _bots[index] = _bots[index].copyWith(
        status: status,
        currentOrderId: currentOrderId,
      );
    }
  }

  void _assignOrdersToIdleBots() {
    if (_pendingOrders.isEmpty) return;
    for (var bot in _bots) {
      if (bot.isIdle && _pendingOrders.isNotEmpty) {
        _processNextOrder(bot);
      }
    }
  }

  void _emitState() {
    if (!_disposed && !_stateController.isClosed) {
      _stateController.add(currentState);
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  /// Releases all resources.  Safe to call multiple times.
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    for (var timer in _botTimers.values) {
      timer.cancel();
    }
    _botTimers.clear();
    _stateController.close();
    _logger.info(_tag, 'Service disposed');
  }
}
