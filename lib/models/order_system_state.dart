import '../models/order.dart';
import '../models/bot.dart';

/// Immutable snapshot of the entire order-management domain state.
///
/// This is the *single source of truth* that flows from the service layer
/// to the UI.  Because it is immutable, it can be safely read from any
/// isolate or widget rebuild without race conditions.
///
/// A senior-level pattern: separate **read model** (this class) from
/// **write model** (the service layer).  The UI never mutates state
/// directly — it dispatches commands, and receives a new snapshot.
class OrderSystemState {
  final List<Order> pendingOrders;
  final List<Order> completedOrders;
  final List<Bot> bots;
  final Map<String, Order> botCurrentOrders;

  const OrderSystemState({
    this.pendingOrders = const [],
    this.completedOrders = const [],
    this.bots = const [],
    this.botCurrentOrders = const {},
  });

  // ── Derived computed properties ──────────────────────────────────────

  int get totalPendingOrders => pendingOrders.length;
  int get totalCompletedOrders => completedOrders.length;
  int get totalBots => bots.length;
  int get activeBots => bots.where((b) => b.isProcessing).length;
  int get idleBots => bots.where((b) => b.isIdle).length;

  /// Returns the [Order] currently being processed by [botId], or `null`.
  Order? orderForBot(String botId) => botCurrentOrders[botId];

  /// Creates a new snapshot with selectively replaced fields.
  OrderSystemState copyWith({
    List<Order>? pendingOrders,
    List<Order>? completedOrders,
    List<Bot>? bots,
    Map<String, Order>? botCurrentOrders,
  }) {
    return OrderSystemState(
      pendingOrders: pendingOrders ?? this.pendingOrders,
      completedOrders: completedOrders ?? this.completedOrders,
      bots: bots ?? this.bots,
      botCurrentOrders: botCurrentOrders ?? this.botCurrentOrders,
    );
  }

  @override
  String toString() =>
      'OrderSystemState(pending=${pendingOrders.length}, '
      'completed=${completedOrders.length}, '
      'bots=${bots.length}, active=$activeBots)';
}

