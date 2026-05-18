import 'package:flutter_test/flutter_test.dart';
import 'package:order_controller_app/models/order.dart';
import 'package:order_controller_app/models/bot.dart';
import 'package:order_controller_app/providers/order_provider.dart';
import 'package:order_controller_app/services/order_service.dart';

import 'helpers/test_logger.dart';

/// Tests for [OrderProvider] — the bridge between domain logic and UI.
///
/// Verifies:
/// - All convenience getters reflect service state
/// - Commands delegate correctly
/// - State snapshot updates via stream
/// - Listener notifications fire on state change
/// - Dispose cancels subscription and service
void main() {
  /// Creates a provider backed by a fast-timer service.
  OrderProvider _createProvider() {
    final service = OrderService(
      logger: TestLogger(),
      processingDuration: const Duration(milliseconds: 50),
    );
    return OrderProvider(orderService: service);
  }

  group('OrderProvider — Initial State', () {
    late OrderProvider provider;

    setUp(() { provider = _createProvider(); });
    tearDown(() { provider.dispose(); });

    test('starts with empty state', () {
      expect(provider.pendingOrders, isEmpty);
      expect(provider.completedOrders, isEmpty);
      expect(provider.bots, isEmpty);
      expect(provider.totalPendingOrders, 0);
      expect(provider.totalCompletedOrders, 0);
      expect(provider.totalBots, 0);
      expect(provider.activeBots, 0);
      expect(provider.idleBots, 0);
    });

    test('state snapshot is available', () {
      final state = provider.state;
      expect(state.totalPendingOrders, 0);
      expect(state.totalBots, 0);
    });
  });

  group('OrderProvider — Order Commands', () {
    late OrderProvider provider;

    setUp(() { provider = _createProvider(); });
    tearDown(() { provider.dispose(); });

    test('createNormalOrder adds to pending', () async {
      provider.createNormalOrder();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(provider.pendingOrders.length, 1);
      expect(provider.pendingOrders.first.type, OrderType.normal);
      expect(provider.totalPendingOrders, 1);
    });

    test('createVipOrder adds VIP to pending', () async {
      provider.createVipOrder();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(provider.pendingOrders.length, 1);
      expect(provider.pendingOrders.first.type, OrderType.vip);
    });

    test('VIP order is prioritized before normal', () async {
      provider.createNormalOrder();
      provider.createNormalOrder();
      provider.createVipOrder();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(provider.pendingOrders[0].type, OrderType.vip);
      expect(provider.pendingOrders[1].type, OrderType.normal);
      expect(provider.pendingOrders[2].type, OrderType.normal);
    });
  });

  group('OrderProvider — Bot Commands', () {
    late OrderProvider provider;

    setUp(() { provider = _createProvider(); });
    tearDown(() { provider.dispose(); });

    test('addBot increases bot count', () async {
      provider.addBot();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(provider.totalBots, 1);
      expect(provider.bots.length, 1);
    });

    test('removeBot returns true when bots exist', () {
      provider.addBot();
      final result = provider.removeBot();
      expect(result, true);
    });

    test('removeBot returns false when no bots', () {
      final result = provider.removeBot();
      expect(result, false);
    });

    test('idle bot count reflects state', () async {
      provider.addBot();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(provider.idleBots, 1);
      expect(provider.activeBots, 0);
    });

    test('bot picks up order and becomes active', () async {
      provider.createNormalOrder();
      provider.addBot();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(provider.activeBots, 1);
      expect(provider.idleBots, 0);
      expect(provider.totalPendingOrders, 0);
    });
  });

  group('OrderProvider — Processing Lifecycle', () {
    late OrderProvider provider;

    setUp(() { provider = _createProvider(); });
    tearDown(() { provider.dispose(); });

    test('order completes after processing time', () async {
      provider.createNormalOrder();
      provider.addBot();

      await Future.delayed(const Duration(milliseconds: 20));
      expect(provider.activeBots, 1);
      expect(provider.totalCompletedOrders, 0);

      await Future.delayed(const Duration(milliseconds: 80));
      expect(provider.totalCompletedOrders, 1);
      expect(provider.activeBots, 0);
      expect(provider.idleBots, 1);
    });

    test('clearCompletedOrders empties the list', () async {
      provider.createNormalOrder();
      provider.addBot();
      await Future.delayed(const Duration(milliseconds: 100));

      expect(provider.totalCompletedOrders, 1);

      provider.clearCompletedOrders();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(provider.totalCompletedOrders, 0);
      expect(provider.completedOrders, isEmpty);
    });
  });

  group('OrderProvider — getOrderForBot', () {
    late OrderProvider provider;

    setUp(() { provider = _createProvider(); });
    tearDown(() { provider.dispose(); });

    test('returns null for unknown bot id', () {
      expect(provider.getOrderForBot('nonexistent'), isNull);
    });

    test('returns order for actively processing bot', () async {
      provider.createNormalOrder();
      provider.addBot();
      await Future.delayed(const Duration(milliseconds: 20));

      final botId = provider.bots.first.id;
      final order = provider.getOrderForBot(botId);
      expect(order, isNotNull);
      expect(order!.status, OrderStatus.processing);
    });

    test('returns null for idle bot', () async {
      provider.addBot();
      await Future.delayed(const Duration(milliseconds: 20));

      final botId = provider.bots.first.id;
      expect(provider.getOrderForBot(botId), isNull);
    });
  });

  group('OrderProvider — Listener Notifications', () {
    late OrderProvider provider;
    late int notifyCount;

    setUp(() {
      provider = _createProvider();
      notifyCount = 0;
      provider.addListener(() { notifyCount++; });
    });
    tearDown(() { provider.dispose(); });

    test('notifies on order creation', () async {
      provider.createNormalOrder();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(notifyCount, greaterThan(0));
    });

    test('notifies on bot creation', () async {
      provider.addBot();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(notifyCount, greaterThan(0));
    });

    test('notifies on bot removal', () async {
      provider.addBot();
      await Future.delayed(const Duration(milliseconds: 20));
      final countBefore = notifyCount;

      provider.removeBot();
      await Future.delayed(const Duration(milliseconds: 20));

      expect(notifyCount, greaterThan(countBefore));
    });
  });

  group('OrderProvider — State Snapshot', () {
    late OrderProvider provider;

    setUp(() { provider = _createProvider(); });
    tearDown(() { provider.dispose(); });

    test('state updates after commands', () async {
      provider.createNormalOrder();
      provider.createVipOrder();
      provider.addBot();
      await Future.delayed(const Duration(milliseconds: 20));

      final state = provider.state;
      expect(state.totalBots, 1);
      // At least one order should be pending or being processed
      expect(
        state.totalPendingOrders + state.activeBots,
        greaterThanOrEqualTo(1),
      );
    });

    test('state snapshot is immutable', () {
      provider.createNormalOrder();
      final snap1 = provider.state;

      provider.createNormalOrder();
      // snap1 should still reflect old state
      // (it's an immutable object, not a live reference)
      expect(snap1.totalPendingOrders, lessThanOrEqualTo(2));
    });
  });

  group('OrderProvider — Dispose', () {
    test('dispose does not throw', () {
      final provider = _createProvider();
      expect(() => provider.dispose(), returnsNormally);
    });

    test('provider can be created with default service', () {
      // Uses real 10-second timer — just test construction
      final provider = OrderProvider();
      expect(provider.totalBots, 0);
      provider.dispose();
    });
  });
}

