/// Centralized string constants for the application.
/// Prevents hardcoded strings scattered across the codebase.
/// In a production app, this would integrate with l10n/intl for localization.
abstract class AppStrings {
  // App
  static const String appTitle = "McDonald's Order System";
  static const String appBarTitle = "McDonald's Orders";

  // Control Panel
  static const String controlPanelTitle = 'Control Panel';
  static const String newNormalOrder = 'New Normal Order';
  static const String newVipOrder = 'New VIP Order';
  static const String normalLabel = 'Normal';
  static const String vipLabel = 'VIP';
  static const String botLabel = 'Bot';

  // Section Headers
  static const String botsSectionTitle = 'BOTS';
  static const String pendingSectionTitle = 'PENDING';
  static const String completedSectionTitle = 'COMPLETED';

  // Stats
  static const String pendingStatLabel = 'Pending';
  static const String botsStatLabel = 'Bots';
  static const String totalBotsStatLabel = 'Total Bots';
  static const String activeStatLabel = 'Active';
  static const String activeBotsStatLabel = 'Active Bots';
  static const String completedStatLabel = 'Completed';

  // Empty States
  static const String noBotsMessage = 'No bots available';
  static const String noBotsHintMobile = 'No bots\nTap "+ Bot" to add';
  static const String noBotsHintDesktop = 'Click "+ Bot" to add one';
  static const String noPendingOrders = 'No pending orders';
  static const String noCompletedOrders = 'No completed orders';
  static const String noCompletedOrdersYet = 'No completed orders yet';
  static const String noPendingShort = 'No pending';
  static const String noBotsShort = 'No bots';
  static const String noCompletedShort = 'No completed';

  // Order
  static String orderNumber(int number) => 'Order #$number';
  static const String vipTypeDisplay = 'VIP';
  static const String normalTypeDisplay = 'Normal';

  // Bot
  static String botNumber(int number) => 'Bot #$number';
  static const String processingStatus = 'PROCESSING';
  static const String idleStatus = 'IDLE';

  // Actions / Feedback
  static const String noBotsToRemove = 'No bots to remove';
  static const String noBotsAvailableToRemove = 'No bots available to remove';
  static const String clearLabel = 'Clear';
  static const String cancelLabel = 'Cancel';
  static const String clearCompletedTitle = 'Clear Completed Orders?';
  static String clearCompletedMessage(int count) =>
      'Remove all $count completed orders from the list?';
  static const String completedOrdersCleared = 'Completed orders cleared';
}

