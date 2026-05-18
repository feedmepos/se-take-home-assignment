import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:order_controller_app/main.dart';
import 'package:order_controller_app/constants/constants.dart';
import 'package:order_controller_app/providers/order_provider.dart';
import 'package:order_controller_app/services/order_service.dart';
import 'package:order_controller_app/screens/order_management_screen.dart';
import 'package:order_controller_app/widgets/order_card.dart';
import 'package:order_controller_app/widgets/bot_card.dart';
import 'package:order_controller_app/widgets/stats_card.dart';
import 'package:order_controller_app/common/widgets/common_widgets.dart';
import 'package:order_controller_app/models/order.dart';
import 'package:order_controller_app/models/bot.dart';

import 'helpers/test_logger.dart';

/// Widget-level tests for UI components and screen integration.
///
/// Uses a fast-timer service injected into the provider so that
/// processing completes quickly during tests.

Widget _wrapWithProvider({
  required Widget child,
  OrderProvider? provider,
}) {
  return ChangeNotifierProvider<OrderProvider>(
    create: (_) => provider ?? OrderProvider(
      orderService: OrderService(
        logger: TestLogger(),
        processingDuration: const Duration(milliseconds: 50),
      ),
    ),
    child: MaterialApp(home: Scaffold(body: child)),
  );
}

Widget _wrapMaterial(Widget child) {
  return MaterialApp(home: Scaffold(body: child));
}

void main() {
  // ── App Smoke Tests ──────────────────────────────────────────────

  group('McDonaldsOrderApp', () {
    testWidgets('renders without crashing', (tester) async {
      tester.view.physicalSize = const Size(1920, 1080);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(const McDonaldsOrderApp());
      expect(find.byType(McDonaldsOrderApp), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('shows app bar with correct title', (tester) async {
      tester.view.physicalSize = const Size(1920, 1080);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(const McDonaldsOrderApp());
      expect(find.text(AppStrings.appBarTitle), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  // ── OrderManagementScreen Layout Tests ───────────────────────────

  group('OrderManagementScreen — Layout Selection', () {
    testWidgets('uses mobile layout on small screen', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(_wrapWithProvider(
        child: const OrderManagementScreen(),
      ));
      await tester.pump();

      // Should NOT show tablet-only "Control Panel" header
      expect(find.text(AppStrings.controlPanelTitle), findsNothing);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('uses tablet layout on wide screen', (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(_wrapWithProvider(
        child: const OrderManagementScreen(),
      ));
      await tester.pump();

      // Tablet layout shows "Control Panel"
      expect(find.text(AppStrings.controlPanelTitle), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  // ── OrderCard Widget Tests ──────────────────────────────────────

  group('OrderCard', () {
    testWidgets('renders normal order correctly', (tester) async {
      final order = Order(
        id: 'o1',
        orderNumber: 5,
        type: OrderType.normal,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        OrderCard(order: order),
      ));

      expect(find.text('Order #5'), findsOneWidget);
      expect(find.text('Normal'), findsOneWidget);
    });

    testWidgets('renders VIP order correctly', (tester) async {
      final order = Order(
        id: 'o2',
        orderNumber: 3,
        type: OrderType.vip,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        OrderCard(order: order),
      ));

      expect(find.text('Order #3'), findsOneWidget);
      expect(find.text('VIP'), findsOneWidget);
    });

    testWidgets('completed order shows check icon', (tester) async {
      final order = Order(
        id: 'o3',
        orderNumber: 1,
        type: OrderType.normal,
        status: OrderStatus.completed,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        OrderCard(order: order),
      ));

      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    });

    testWidgets('pending order does not show check icon', (tester) async {
      final order = Order(
        id: 'o4',
        orderNumber: 1,
        type: OrderType.normal,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        OrderCard(order: order),
      ));

      expect(find.byIcon(Icons.check_circle), findsNothing);
    });

    testWidgets('compact mode renders with smaller sizes', (tester) async {
      final order = Order(
        id: 'o5',
        orderNumber: 1,
        type: OrderType.normal,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        OrderCard(order: order, isCompact: true),
      ));

      expect(find.text('Order #1'), findsOneWidget);
    });

    testWidgets('animation renders when showAnimation is true', (tester) async {
      final order = Order(
        id: 'o6',
        orderNumber: 1,
        type: OrderType.normal,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        OrderCard(order: order, showAnimation: true),
      ));

      // Should find TweenAnimationBuilder in the tree
      expect(find.byType(TweenAnimationBuilder<double>), findsOneWidget);
    });
  });

  // ── BotCard Widget Tests ────────────────────────────────────────

  group('BotCard', () {
    testWidgets('renders idle bot correctly', (tester) async {
      final bot = Bot(
        id: 'b1',
        botNumber: 1,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        BotCard(bot: bot),
      ));

      expect(find.text('Bot #1'), findsOneWidget);
      expect(find.text('IDLE'), findsOneWidget);
    });

    testWidgets('renders processing bot correctly', (tester) async {
      final bot = Bot(
        id: 'b1',
        botNumber: 2,
        status: BotStatus.processing,
        currentOrderId: 'o1',
        createdAt: DateTime.now(),
      );
      final order = Order(
        id: 'o1',
        orderNumber: 7,
        type: OrderType.vip,
        status: OrderStatus.processing,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        BotCard(bot: bot, currentOrder: order),
      ));

      expect(find.text('Bot #2'), findsOneWidget);
      expect(find.text('PROCESSING'), findsOneWidget);
      expect(find.text('Order #7'), findsOneWidget);
    });

    testWidgets('idle bot does not show order details', (tester) async {
      final bot = Bot(
        id: 'b1',
        botNumber: 1,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        BotCard(bot: bot),
      ));

      expect(find.text('IDLE'), findsOneWidget);
      // No order number should appear
      expect(find.textContaining('Order #'), findsNothing);
    });

    testWidgets('compact mode renders correctly', (tester) async {
      final bot = Bot(
        id: 'b1',
        botNumber: 1,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(_wrapMaterial(
        BotCard(bot: bot, isCompact: true),
      ));

      expect(find.text('Bot #1'), findsOneWidget);
    });
  });

  // ── StatsCard Widget Tests ──────────────────────────────────────

  group('StatsCard', () {
    testWidgets('renders title and value', (tester) async {
      await tester.pumpWidget(_wrapMaterial(
        const StatsCard(
          title: 'Pending',
          value: '42',
          icon: Icons.pending,
          color: Colors.orange,
        ),
      ));

      expect(find.text('Pending'), findsOneWidget);
      expect(find.text('42'), findsOneWidget);
    });

    testWidgets('renders icon', (tester) async {
      await tester.pumpWidget(_wrapMaterial(
        const StatsCard(
          title: 'Bots',
          value: '3',
          icon: Icons.smart_toy,
          color: Colors.blue,
        ),
      ));

      expect(find.byIcon(Icons.smart_toy), findsOneWidget);
    });
  });

  // ── Common Widgets ──────────────────────────────────────────────

  group('EmptyStateWidget', () {
    testWidgets('renders icon and message', (tester) async {
      await tester.pumpWidget(_wrapMaterial(
        const EmptyStateWidget(
          icon: Icons.smart_toy,
          message: 'No bots available',
        ),
      ));

      expect(find.byIcon(Icons.smart_toy), findsOneWidget);
      expect(find.text('No bots available'), findsOneWidget);
    });
  });

  group('ClearButton', () {
    testWidgets('renders and responds to tap', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(_wrapMaterial(
        ClearButton(onTap: () { tapped = true; }),
      ));

      expect(find.text(AppStrings.clearLabel), findsOneWidget);

      await tester.tap(find.text(AppStrings.clearLabel));
      expect(tapped, true);
    });
  });

  group('SectionContainer', () {
    testWidgets('renders title, icon, count badge, and child', (tester) async {
      await tester.pumpWidget(_wrapMaterial(
        SectionContainer(
          title: 'PENDING',
          icon: Icons.pending_actions,
          color: Colors.orange,
          count: 5,
          child: const Text('Test child'),
        ),
      ));

      expect(find.text('PENDING'), findsOneWidget);
      expect(find.text('5'), findsOneWidget);
      expect(find.text('Test child'), findsOneWidget);
      expect(find.byIcon(Icons.pending_actions), findsOneWidget);
    });

    testWidgets('renders trailing widget when provided', (tester) async {
      await tester.pumpWidget(_wrapMaterial(
        SectionContainer(
          title: 'DONE',
          icon: Icons.check_circle,
          color: Colors.green,
          count: 3,
          trailing: const Text('TRAILING'),
          child: const SizedBox(),
        ),
      ));

      expect(find.text('TRAILING'), findsOneWidget);
    });

    testWidgets('no trailing when null', (tester) async {
      await tester.pumpWidget(_wrapMaterial(
        SectionContainer(
          title: 'BOTS',
          icon: Icons.smart_toy,
          color: Colors.blue,
          count: 0,
          child: const SizedBox(),
        ),
      ));

      expect(find.text('BOTS'), findsOneWidget);
    });
  });

  // ── Mobile Integration Tests ─────────────────────────────────────

  group('Mobile Layout — User Interaction', () {
    testWidgets('tapping Normal button creates an order', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;

      final service = OrderService(
        logger: TestLogger(),
        processingDuration: const Duration(milliseconds: 50),
      );
      final provider = OrderProvider(orderService: service);

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>.value(
        value: provider,
        child: MaterialApp(home: const OrderManagementScreen()),
      ));
      await tester.pump();

      // Find and tap the Normal button
      final normalButton = find.text(AppStrings.normalLabel);
      expect(normalButton, findsOneWidget);

      await tester.tap(normalButton);
      await tester.pump(const Duration(milliseconds: 50));

      // Pending count should update
      expect(provider.totalPendingOrders, 1);

      addTearDown(() {
        provider.dispose();
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('tapping VIP button creates a VIP order', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;

      final service = OrderService(
        logger: TestLogger(),
        processingDuration: const Duration(milliseconds: 50),
      );
      final provider = OrderProvider(orderService: service);

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>.value(
        value: provider,
        child: MaterialApp(home: const OrderManagementScreen()),
      ));
      await tester.pump();

      await tester.tap(find.text(AppStrings.vipLabel));
      await tester.pump(const Duration(milliseconds: 50));

      expect(provider.pendingOrders.first.type, OrderType.vip);

      addTearDown(() {
        provider.dispose();
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('- Bot button shows snackbar when no bots', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(_wrapWithProvider(
        child: const OrderManagementScreen(),
      ));
      await tester.pump();

      // Both + and - bot buttons show "Bot" label; the - Bot button is the
      // last one with a remove icon. Find all "Bot" texts and tap the last.
      final botButtons = find.text(AppStrings.botLabel);
      expect(botButtons, findsWidgets);

      // The second "Bot" button is the remove button
      await tester.tap(botButtons.last);
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(find.text(AppStrings.noBotsToRemove), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });
}




