import 'package:flutter/foundation.dart';
import '../models/order.dart';

class OrderController extends ChangeNotifier {
  final List<Order> pendingOrders = [];
  final List<Order> completeOrders = [];
  final List<Bot> activeBots = [];
  
  int _nextOrderId = 1;
  int _nextBotId = 1;

  OrderController();

  /// Create a new normal order
  void addNormalOrder() {
    final order = Order(
      id: _nextOrderId++,
      type: OrderType.normal,
    );
    pendingOrders.add(order);
    notifyListeners();
    _processOrders();
  }

  /// Create a new VIP order
  void addVIPOrder() {
    final order = Order(
      id: _nextOrderId++,
      type: OrderType.vip,
    );
    
    // Insert VIP order: before all normal orders, but after existing VIP orders
    int insertIndex = 0;
    for (int i = 0; i < pendingOrders.length; i++) {
      if (pendingOrders[i].type == OrderType.vip) {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    pendingOrders.insert(insertIndex, order);
    notifyListeners();
    _processOrders();
  }

  /// Add a new bot to the system
  void addBot() {
    final bot = Bot(id: _nextBotId++);
    activeBots.add(bot);
    notifyListeners();
    _processOrders();
  }

  /// Remove the newest bot
  void removeBot() {
    if (activeBots.isEmpty) return;

    final botToRemove = activeBots.removeLast();

    // If bot was processing an order, return it to pending
    if (botToRemove.currentOrder != null) {
      final order = botToRemove.currentOrder!;
      order.status = OrderStatus.pending;
      
      // Reinsert the order at the correct position based on its type
      int insertIndex = 0;
      for (int i = 0; i < pendingOrders.length; i++) {
        if (pendingOrders[i].type == OrderType.vip) {
          insertIndex = i + 1;
        } else if (order.type == OrderType.vip) {
          break;
        }
      }
      pendingOrders.insert(insertIndex, order);
    }

    notifyListeners();
    _processOrders();
  }

  /// Process orders with available bots (internal logic)
  void _processOrders() {
    // Find idle bots and assign them pending orders
    for (final bot in activeBots) {
      if (bot.isIdle && pendingOrders.isNotEmpty) {
        final order = pendingOrders.removeAt(0);
        bot.currentOrder = order;
        bot.isIdle = false;
        bot.processingStartedAt = DateTime.now();
        notifyListeners();
        
        // Schedule order completion after 10 seconds
        Future.delayed(const Duration(seconds: 10), () {
          _completeOrder(bot);
        });
      }
    }
  }

  /// Complete an order and move it to completed area
  void _completeOrder(Bot bot) {
    if (bot.currentOrder == null) return;

    final order = bot.currentOrder!;
    order.status = OrderStatus.complete;
    order.completedAt = DateTime.now();
    
    completeOrders.add(order);
    bot.currentOrder = null;
    bot.isIdle = true;
    bot.processingStartedAt = null;
    
    notifyListeners();
    
    // Process next order if available
    _processOrders();
  }

  /// Get all orders sorted by status
  List<Order> getAllOrders() => [...pendingOrders, ...completeOrders];

  /// Get stats
  Map<String, dynamic> getStats() {
    return {
      'total_orders': _nextOrderId - 1,
      'pending': pendingOrders.length,
      'complete': completeOrders.length,
      'bots': activeBots.length,
      'idle_bots': activeBots.where((b) => b.isIdle).length,
    };
  }

  /// Get a detailed status string for debugging
  String getStatus() {
    final stats = getStats();
    final sb = StringBuffer();
    sb.writeln('=== Order Management Status ===');
    sb.writeln('Total Orders: ${stats['total_orders']}');
    sb.writeln('Pending: ${stats['pending']} | Complete: ${stats['complete']}');
    sb.writeln('Bots: ${stats['bots']} | Idle: ${stats['idle_bots']}');
    sb.writeln('\nPending Orders:');
    for (final order in pendingOrders) {
      sb.writeln('  $order (created: ${order.createdTimeString})');
    }
    sb.writeln('\nActive Bots:');
    for (final bot in activeBots) {
      final processing = bot.currentOrder?.displayId ?? 'IDLE';
      sb.writeln('  ${bot.displayId}: $processing');
    }
    return sb.toString();
  }
}
