import 'package:flutter_test/flutter_test.dart';
import 'package:order_controller_app/models/order.dart';
import 'package:order_controller_app/models/bot.dart';
import 'package:order_controller_app/models/order_system_state.dart';

/// Tests for all domain models: Order, Bot, OrderSystemState.
/// Covers constructors, copyWith, equality, toString, hashCode,
/// and all computed properties.
void main() {
  // ── Order ────────────────────────────────────────────────────────

  group('Order', () {
    late Order order;
    final now = DateTime(2026, 1, 1);

    setUp(() {
      order = Order(
        id: 'o1',
        orderNumber: 1,
        type: OrderType.normal,
        createdAt: now,
      );
    });

    test('default status is pending', () {
      expect(order.status, OrderStatus.pending);
      expect(order.processingBotId, isNull);
    });

    test('typeDisplay returns "Normal" for normal', () {
      expect(order.typeDisplay, 'Normal');
    });

    test('typeDisplay returns "VIP" for vip', () {
      final vip = order.copyWith(type: OrderType.vip);
      expect(vip.typeDisplay, 'VIP');
    });

    test('typeColorHex returns correct values', () {
      expect(order.typeColorHex, '#90EE90');
      final vip = order.copyWith(type: OrderType.vip);
      expect(vip.typeColorHex, '#FFD700');
    });

    test('copyWith preserves all fields when none specified', () {
      final copy = order.copyWith();
      expect(copy.id, order.id);
      expect(copy.orderNumber, order.orderNumber);
      expect(copy.type, order.type);
      expect(copy.status, order.status);
      expect(copy.createdAt, order.createdAt);
      expect(copy.processingBotId, order.processingBotId);
    });

    test('copyWith updates specified fields only', () {
      final updated = order.copyWith(
        status: OrderStatus.completed,
        processingBotId: 'bot-x',
      );
      expect(updated.status, OrderStatus.completed);
      expect(updated.processingBotId, 'bot-x');
      expect(updated.id, order.id); // unchanged
      expect(updated.orderNumber, order.orderNumber); // unchanged
    });

    test('equality based on id', () {
      final same = Order(id: 'o1', orderNumber: 99, type: OrderType.vip, createdAt: DateTime(2099));
      final diff = Order(id: 'o2', orderNumber: 1, type: OrderType.normal, createdAt: now);

      expect(order == same, true);
      expect(order == diff, false);
    });

    test('hashCode based on id', () {
      final same = Order(id: 'o1', orderNumber: 99, type: OrderType.vip, createdAt: DateTime(2099));
      expect(order.hashCode, same.hashCode);
    });

    test('toString contains key fields', () {
      final str = order.toString();
      expect(str, contains('orderNumber: 1'));
      expect(str, contains('OrderType.normal'));
      expect(str, contains('OrderStatus.pending'));
    });
  });

  group('OrderType enum', () {
    test('displayName for all values', () {
      expect(OrderType.normal.displayName, 'Normal');
      expect(OrderType.vip.displayName, 'VIP');
    });

    test('values coverage', () {
      expect(OrderType.values.length, 2);
    });
  });

  group('OrderStatus enum', () {
    test('values coverage', () {
      expect(OrderStatus.values, contains(OrderStatus.pending));
      expect(OrderStatus.values, contains(OrderStatus.processing));
      expect(OrderStatus.values, contains(OrderStatus.completed));
      expect(OrderStatus.values.length, 3);
    });
  });

  // ── Bot ──────────────────────────────────────────────────────────

  group('Bot', () {
    late Bot bot;
    final now = DateTime(2026, 1, 1);

    setUp(() {
      bot = Bot(id: 'b1', botNumber: 1, createdAt: now);
    });

    test('defaults to idle with no order', () {
      expect(bot.status, BotStatus.idle);
      expect(bot.isIdle, true);
      expect(bot.isProcessing, false);
      expect(bot.currentOrderId, isNull);
    });

    test('copyWith updates status correctly', () {
      final processing = bot.copyWith(
        status: BotStatus.processing,
        currentOrderId: 'order-1',
      );
      expect(processing.isProcessing, true);
      expect(processing.isIdle, false);
      expect(processing.currentOrderId, 'order-1');
    });

    test('copyWith can clear currentOrderId', () {
      final withOrder = bot.copyWith(
        status: BotStatus.processing,
        currentOrderId: 'order-1',
      );
      // copyWith with null currentOrderId clears it
      final cleared = withOrder.copyWith(status: BotStatus.idle);
      expect(cleared.currentOrderId, isNull);
    });

    test('copyWith preserves fields when none specified', () {
      final copy = bot.copyWith();
      expect(copy.id, bot.id);
      expect(copy.botNumber, bot.botNumber);
      expect(copy.status, bot.status);
      expect(copy.createdAt, bot.createdAt);
    });

    test('equality based on id', () {
      final same = Bot(id: 'b1', botNumber: 99, createdAt: DateTime(2099));
      final diff = Bot(id: 'b2', botNumber: 1, createdAt: now);

      expect(bot == same, true);
      expect(bot == diff, false);
    });

    test('hashCode based on id', () {
      final same = Bot(id: 'b1', botNumber: 99, createdAt: DateTime(2099));
      expect(bot.hashCode, same.hashCode);
    });

    test('toString contains key fields', () {
      final str = bot.toString();
      expect(str, contains('botNumber: 1'));
      expect(str, contains('BotStatus.idle'));
    });
  });

  group('BotStatus enum', () {
    test('values coverage', () {
      expect(BotStatus.values.length, 2);
      expect(BotStatus.values, contains(BotStatus.idle));
      expect(BotStatus.values, contains(BotStatus.processing));
    });
  });

  // ── OrderSystemState ─────────────────────────────────────────────

  group('OrderSystemState', () {
    test('const default is empty', () {
      const s = OrderSystemState();
      expect(s.totalPendingOrders, 0);
      expect(s.totalCompletedOrders, 0);
      expect(s.totalBots, 0);
      expect(s.activeBots, 0);
      expect(s.idleBots, 0);
      expect(s.pendingOrders, isEmpty);
      expect(s.completedOrders, isEmpty);
      expect(s.bots, isEmpty);
      expect(s.botCurrentOrders, isEmpty);
    });

    test('computed props with mixed bots', () {
      final s = OrderSystemState(
        pendingOrders: [
          Order(id: '1', orderNumber: 1, type: OrderType.normal, createdAt: DateTime.now()),
          Order(id: '2', orderNumber: 2, type: OrderType.vip, createdAt: DateTime.now()),
        ],
        completedOrders: [
          Order(id: '3', orderNumber: 3, type: OrderType.normal, status: OrderStatus.completed, createdAt: DateTime.now()),
        ],
        bots: [
          Bot(id: 'b1', botNumber: 1, status: BotStatus.processing, createdAt: DateTime.now()),
          Bot(id: 'b2', botNumber: 2, createdAt: DateTime.now()),
          Bot(id: 'b3', botNumber: 3, status: BotStatus.processing, createdAt: DateTime.now()),
        ],
      );

      expect(s.totalPendingOrders, 2);
      expect(s.totalCompletedOrders, 1);
      expect(s.totalBots, 3);
      expect(s.activeBots, 2);
      expect(s.idleBots, 1);
    });

    test('orderForBot returns correct order', () {
      final order = Order(id: 'o1', orderNumber: 1, type: OrderType.vip, createdAt: DateTime.now());
      final s = OrderSystemState(
        botCurrentOrders: {'bot-1': order},
      );

      expect(s.orderForBot('bot-1'), order);
      expect(s.orderForBot('bot-999'), isNull);
    });

    test('copyWith replaces specified fields', () {
      final original = OrderSystemState(
        pendingOrders: [
          Order(id: '1', orderNumber: 1, type: OrderType.normal, createdAt: DateTime.now()),
        ],
      );

      final updated = original.copyWith(pendingOrders: []);
      expect(updated.totalPendingOrders, 0);
      expect(original.totalPendingOrders, 1); // unchanged
    });

    test('copyWith preserves unspecified fields', () {
      final order = Order(id: '1', orderNumber: 1, type: OrderType.normal, createdAt: DateTime.now());
      final bot = Bot(id: 'b1', botNumber: 1, createdAt: DateTime.now());
      final original = OrderSystemState(
        pendingOrders: [order],
        bots: [bot],
      );

      final updated = original.copyWith(completedOrders: [order]);
      expect(updated.pendingOrders, hasLength(1));
      expect(updated.bots, hasLength(1));
      expect(updated.completedOrders, hasLength(1));
    });

    test('toString contains counts', () {
      const s = OrderSystemState();
      final str = s.toString();
      expect(str, contains('pending=0'));
      expect(str, contains('completed=0'));
      expect(str, contains('bots=0'));
      expect(str, contains('active=0'));
    });
  });
}

