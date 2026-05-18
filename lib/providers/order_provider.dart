import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/order.dart';
import '../models/bot.dart';
import '../models/order_system_state.dart';
import '../services/order_service.dart';

/// Bridges the domain [OrderService] with the Flutter widget tree.
///
/// Design notes:
/// - Subscriptions are stored and **cancelled** in [dispose] to prevent
///   memory leaks — a common production bug when using bare `.listen()`.
/// - Exposes the immutable [OrderSystemState] snapshot for widgets that
///   prefer a single object (e.g., `Selector<OrderProvider, int>`).
/// - Keeps backward-compatible convenience getters so existing UI code
///   doesn't need to change.
class OrderProvider with ChangeNotifier {
  final OrderService _orderService;
  late final StreamSubscription<OrderSystemState> _stateSub;

  /// Latest immutable state snapshot from the service layer.
  OrderSystemState _state = const OrderSystemState();

  OrderProvider({OrderService? orderService})
      : _orderService = orderService ?? OrderService() {
    _stateSub = _orderService.stateStream.listen(_onStateChanged);
    // Seed initial state
    _state = _orderService.currentState;
  }

  void _onStateChanged(OrderSystemState newState) {
    _state = newState;
    notifyListeners();
  }

  // ── Immutable snapshot access ──────────────────────────────────────
  OrderSystemState get state => _state;

  // ── Convenience getters (backward-compatible with existing UI) ─────
  List<Order> get pendingOrders => _state.pendingOrders;
  List<Order> get completedOrders => _state.completedOrders;
  List<Bot> get bots => _state.bots;

  int get totalPendingOrders => _state.totalPendingOrders;
  int get totalCompletedOrders => _state.totalCompletedOrders;
  int get totalBots => _state.totalBots;
  int get activeBots => _state.activeBots;
  int get idleBots => _state.idleBots;

  // ── Commands (delegate to service) ─────────────────────────────────
  void createNormalOrder() => _orderService.createOrder(OrderType.normal);
  void createVipOrder() => _orderService.createOrder(OrderType.vip);
  void addBot() => _orderService.createBot();
  bool removeBot() => _orderService.removeBot();
  void clearCompletedOrders() => _orderService.clearCompletedOrders();
  Order? getOrderForBot(String botId) => _state.orderForBot(botId);

  // ── Lifecycle ──────────────────────────────────────────────────────
  @override
  void dispose() {
    _stateSub.cancel();
    _orderService.dispose();
    super.dispose();
  }
}
