import 'package:flutter_test/flutter_test.dart';
import 'package:order_controller_app/constants/app_strings.dart';
import 'package:order_controller_app/constants/app_colors.dart';
import 'package:order_controller_app/constants/app_sizes.dart';

/// Tests for centralized constants — ensures they are correctly
/// defined and prevents accidental regressions from typos.
void main() {
  group('AppStrings', () {
    test('app title is defined', () {
      expect(AppStrings.appTitle, isNotEmpty);
      expect(AppStrings.appBarTitle, isNotEmpty);
    });

    test('control panel labels are defined', () {
      expect(AppStrings.normalLabel, isNotEmpty);
      expect(AppStrings.vipLabel, isNotEmpty);
      expect(AppStrings.botLabel, isNotEmpty);
    });

    test('orderNumber formats correctly', () {
      expect(AppStrings.orderNumber(1), 'Order #1');
      expect(AppStrings.orderNumber(42), 'Order #42');
    });

    test('botNumber formats correctly', () {
      expect(AppStrings.botNumber(1), 'Bot #1');
      expect(AppStrings.botNumber(99), 'Bot #99');
    });

    test('clearCompletedMessage includes count', () {
      final msg = AppStrings.clearCompletedMessage(5);
      expect(msg, contains('5'));
      expect(msg, contains('completed'));
    });

    test('type display strings match enum expectations', () {
      expect(AppStrings.vipTypeDisplay, 'VIP');
      expect(AppStrings.normalTypeDisplay, 'Normal');
    });

    test('status strings are defined', () {
      expect(AppStrings.processingStatus, 'PROCESSING');
      expect(AppStrings.idleStatus, 'IDLE');
    });

    test('empty state messages are non-empty', () {
      expect(AppStrings.noBotsMessage, isNotEmpty);
      expect(AppStrings.noPendingOrders, isNotEmpty);
      expect(AppStrings.noCompletedOrders, isNotEmpty);
      expect(AppStrings.noBotsHintMobile, isNotEmpty);
      expect(AppStrings.noBotsHintDesktop, isNotEmpty);
    });

    test('action feedback strings are non-empty', () {
      expect(AppStrings.noBotsToRemove, isNotEmpty);
      expect(AppStrings.completedOrdersCleared, isNotEmpty);
      expect(AppStrings.clearLabel, isNotEmpty);
      expect(AppStrings.cancelLabel, isNotEmpty);
    });
  });

  group('AppColors', () {
    test('primary colors are defined', () {
      expect(AppColors.primary, isNotNull);
      expect(AppColors.primaryLight, isNotNull);
    });

    test('order type colors are defined', () {
      expect(AppColors.vipCard, isNotNull);
      expect(AppColors.vipBorder, isNotNull);
      expect(AppColors.normalCard, isNotNull);
      expect(AppColors.normalBorder, isNotNull);
    });

    test('bot status colors are defined', () {
      expect(AppColors.processingColor, isNotNull);
      expect(AppColors.idleColor, isNotNull);
    });

    test('section colors are defined', () {
      expect(AppColors.botsSection, isNotNull);
      expect(AppColors.pendingSection, isNotNull);
      expect(AppColors.completedSection, isNotNull);
      expect(AppColors.activeSection, isNotNull);
    });

    test('shadow returns valid color', () {
      final shadow = AppColors.shadow(0.5);
      expect(shadow, isNotNull);
      expect(shadow.opacity, closeTo(0.5, 0.01));
    });
  });

  group('AppSizes', () {
    test('breakpoints are logically ordered', () {
      expect(AppSizes.smallScreenMaxWidth, lessThan(AppSizes.mobileMaxWidth));
      expect(AppSizes.mobileMaxWidth, lessThan(AppSizes.tabletMinWidth));
    });

    test('border radii are positive', () {
      expect(AppSizes.radiusSmall, greaterThan(0));
      expect(AppSizes.radiusMedium, greaterThan(AppSizes.radiusSmall));
      expect(AppSizes.radiusLarge, greaterThan(AppSizes.radiusMedium));
      expect(AppSizes.radiusXLarge, greaterThan(AppSizes.radiusLarge));
    });

    test('font sizes are positive and ordered', () {
      expect(AppSizes.fontXSmall, greaterThan(0));
      expect(AppSizes.fontDisplay, greaterThan(AppSizes.fontTitle));
    });

    test('spacing values are positive and ordered', () {
      expect(AppSizes.spacingXSmall, greaterThan(0));
      expect(AppSizes.spacingXLarge, greaterThan(AppSizes.spacingSmall));
    });

    test('processing time is 10 seconds', () {
      expect(AppSizes.processingTimeSeconds, 10);
    });

    test('landscape sidebar width is positive', () {
      expect(AppSizes.landscapeSidebarWidth, greaterThan(0));
    });

    test('compact card values are smaller than default', () {
      expect(AppSizes.compactPadding, lessThan(AppSizes.defaultPadding));
      expect(AppSizes.compactBorderWidth, lessThan(AppSizes.defaultBorderWidth));
    });
  });
}


