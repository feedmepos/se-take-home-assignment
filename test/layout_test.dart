import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:order_controller_app/constants/constants.dart';
import 'package:order_controller_app/providers/order_provider.dart';
import 'package:order_controller_app/services/order_service.dart';
import 'package:order_controller_app/screens/order_management_screen.dart';

import 'helpers/test_logger.dart';

/// Additional widget tests for landscape layout and mobile sections with data.

void main() {
  // ── Landscape Layout Tests ───────────────────────────────────────

  group('Landscape Layout', () {
    testWidgets('renders landscape layout with 3 columns', (tester) async {
      tester.view.physicalSize = const Size(800, 400);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>(
        create: (_) => OrderProvider(
          orderService: OrderService(
            logger: TestLogger(),
            processingDuration: const Duration(milliseconds: 50),
          ),
        ),
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      expect(find.text(AppStrings.pendingSectionTitle), findsOneWidget);
      expect(find.text(AppStrings.botsSectionTitle), findsOneWidget);
      expect(find.text(AppStrings.completedSectionTitle), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('landscape layout shows sidebar buttons', (tester) async {
      tester.view.physicalSize = const Size(800, 400);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>(
        create: (_) => OrderProvider(
          orderService: OrderService(
            logger: TestLogger(),
            processingDuration: const Duration(milliseconds: 50),
          ),
        ),
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      expect(find.text(AppStrings.normalLabel), findsOneWidget);
      expect(find.text(AppStrings.vipLabel), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('landscape layout shows empty state messages', (tester) async {
      tester.view.physicalSize = const Size(800, 400);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>(
        create: (_) => OrderProvider(
          orderService: OrderService(
            logger: TestLogger(),
            processingDuration: const Duration(milliseconds: 50),
          ),
        ),
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      expect(find.text(AppStrings.noPendingShort), findsOneWidget);
      expect(find.text(AppStrings.noBotsShort), findsOneWidget);
      expect(find.text(AppStrings.noCompletedShort), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('landscape: creating order shows in pending column', (tester) async {
      tester.view.physicalSize = const Size(800, 400);
      tester.view.devicePixelRatio = 1.0;

      final provider = OrderProvider(
        orderService: OrderService(
          logger: TestLogger(),
          processingDuration: const Duration(milliseconds: 50),
        ),
      );

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>.value(
        value: provider,
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      await tester.tap(find.text(AppStrings.normalLabel));
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Order #1'), findsOneWidget);

      addTearDown(() {
        provider.dispose();
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('landscape: adding bot shows in bots column', (tester) async {
      tester.view.physicalSize = const Size(800, 400);
      tester.view.devicePixelRatio = 1.0;

      final provider = OrderProvider(
        orderService: OrderService(
          logger: TestLogger(),
          processingDuration: const Duration(milliseconds: 50),
        ),
      );

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>.value(
        value: provider,
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      final addButtons = find.byIcon(Icons.add);
      await tester.tap(addButtons.first);
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Bot #1'), findsOneWidget);

      addTearDown(() {
        provider.dispose();
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('landscape: stats show correct labels', (tester) async {
      tester.view.physicalSize = const Size(800, 400);
      tester.view.devicePixelRatio = 1.0;

      final provider = OrderProvider(
        orderService: OrderService(
          logger: TestLogger(),
          processingDuration: const Duration(milliseconds: 50),
        ),
      );

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>.value(
        value: provider,
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      expect(find.text(AppStrings.pendingStatLabel), findsOneWidget);
      expect(find.text(AppStrings.botsStatLabel), findsOneWidget);
      expect(find.text(AppStrings.activeStatLabel), findsOneWidget);
      expect(find.text(AppStrings.completedStatLabel), findsOneWidget);

      addTearDown(() {
        provider.dispose();
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('landscape: remove bot snackbar when no bots', (tester) async {
      tester.view.physicalSize = const Size(800, 400);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>(
        create: (_) => OrderProvider(
          orderService: OrderService(
            logger: TestLogger(),
            processingDuration: const Duration(milliseconds: 50),
          ),
        ),
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      // The remove button has an Icons.remove icon
      final removeButtons = find.byIcon(Icons.remove);
      await tester.tap(removeButtons.first);
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(find.text(AppStrings.noBotsToRemove), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  // ── Mobile Layout — Sections with data ──────────────────────────

  group('Mobile Layout — Sections with data', () {
    testWidgets('shows bots section with bot card after adding bot', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;

      final provider = OrderProvider(
        orderService: OrderService(
          logger: TestLogger(),
          processingDuration: const Duration(milliseconds: 50),
        ),
      );

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>.value(
        value: provider,
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      final addBtn = find.byIcon(Icons.add);
      await tester.tap(addBtn.first);
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Bot #1'), findsOneWidget);
      expect(find.text('IDLE'), findsOneWidget);

      addTearDown(() {
        provider.dispose();
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('shows pending orders with order cards', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;

      final provider = OrderProvider(
        orderService: OrderService(
          logger: TestLogger(),
          processingDuration: const Duration(milliseconds: 50),
        ),
      );

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>.value(
        value: provider,
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      await tester.tap(find.text(AppStrings.normalLabel));
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Order #1'), findsOneWidget);
      expect(find.text('Normal'), findsAtLeast(1));

      addTearDown(() {
        provider.dispose();
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('shows empty state messages when no data', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>(
        create: (_) => OrderProvider(
          orderService: OrderService(
            logger: TestLogger(),
            processingDuration: const Duration(milliseconds: 50),
          ),
        ),
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      expect(find.text(AppStrings.noBotsHintMobile), findsOneWidget);
      expect(find.text(AppStrings.noPendingOrders), findsOneWidget);
      expect(find.text(AppStrings.noCompletedOrders), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('shows stats dashboard values', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(ChangeNotifierProvider<OrderProvider>(
        create: (_) => OrderProvider(
          orderService: OrderService(
            logger: TestLogger(),
            processingDuration: const Duration(milliseconds: 50),
          ),
        ),
        child: MaterialApp(home: Scaffold(body: const OrderManagementScreen())),
      ));
      await tester.pump();

      // Stats dashboard should be visible
      expect(find.text(AppStrings.pendingStatLabel), findsOneWidget);
      expect(find.text(AppStrings.botsStatLabel), findsOneWidget);
      expect(find.text(AppStrings.activeStatLabel), findsOneWidget);
      expect(find.text(AppStrings.completedStatLabel), findsOneWidget);

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });
}


