import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/constants.dart';
import '../../common/widgets/common_widgets.dart';
import '../../providers/order_provider.dart';
import '../../widgets/order_card.dart';
import '../../widgets/bot_card.dart';
import '../../widgets/stats_card.dart';

/// Tablet / desktop layout with fixed control panel + stats at top,
/// and three side-by-side scrollable columns for Pending, Bots, Completed.
class TabletLayout extends StatelessWidget {
  const TabletLayout({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<OrderProvider>(
      builder: (context, provider, _) {
        return Column(
          children: [
            _ControlPanel(provider: provider),
            _StatsDashboard(provider: provider),
            Expanded(
              child: Row(
                children: [
                  Expanded(child: _PendingColumn(provider: provider)),
                  Expanded(child: _BotsColumn(provider: provider)),
                  Expanded(child: _CompletedColumn(provider: provider)),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

// --- Control Panel ---
class _ControlPanel extends StatelessWidget {
  final OrderProvider provider;
  const _ControlPanel({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSizes.spacingMedium,
        AppSizes.spacingLarge,
        AppSizes.spacingMedium,
        AppSizes.spacingMedium,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.controlPanelTitle,
            style: TextStyle(
              fontSize: AppSizes.fontHeadline,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppSizes.spacingLarge),
          Wrap(
            spacing: AppSizes.spacingLarge,
            runSpacing: AppSizes.spacingLarge,
            children: [
              _ActionButton(
                label: AppStrings.newNormalOrder,
                icon: Icons.fastfood,
                color: AppColors.normalOrderButton,
                onPressed: provider.createNormalOrder,
              ),
              _ActionButton(
                label: AppStrings.newVipOrder,
                icon: Icons.star,
                color: AppColors.vipOrderButton,
                onPressed: provider.createVipOrder,
              ),
              _ActionButton(
                label: AppStrings.botLabel,
                icon: Icons.add_circle,
                color: AppColors.addBotButton,
                onPressed: provider.addBot,
              ),
              _ActionButton(
                label: AppStrings.botLabel,
                icon: Icons.remove_circle,
                color: AppColors.removeBotButton,
                onPressed: () {
                  final removed = provider.removeBot();
                  if (!removed) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(AppStrings.noBotsAvailableToRemove),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 20),
      label: Text(
        label,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: AppSizes.fontSubtitle,
        ),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        elevation: 2,
      ),
    );
  }
}

// --- Stats Dashboard ---
class _StatsDashboard extends StatelessWidget {
  final OrderProvider provider;
  const _StatsDashboard({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSizes.spacingMedium),
      child: Row(
        children: [
          Expanded(
            child: StatsCard(
              title: AppStrings.pendingStatLabel,
              value: '${provider.totalPendingOrders}',
              icon: Icons.pending,
              color: AppColors.pendingSection,
            ),
          ),
          const SizedBox(width: AppSizes.spacingLarge),
          Expanded(
            child: StatsCard(
              title: AppStrings.totalBotsStatLabel,
              value: '${provider.totalBots}',
              icon: Icons.smart_toy,
              color: AppColors.botsSection,
            ),
          ),
          const SizedBox(width: AppSizes.spacingLarge),
          Expanded(
            child: StatsCard(
              title: AppStrings.activeBotsStatLabel,
              value: '${provider.activeBots}',
              icon: Icons.engineering,
              color: AppColors.activeSection,
            ),
          ),
          const SizedBox(width: AppSizes.spacingLarge),
          Expanded(
            child: StatsCard(
              title: AppStrings.completedStatLabel,
              value: '${provider.totalCompletedOrders}',
              icon: Icons.check_circle,
              color: AppColors.completedSection,
            ),
          ),
        ],
      ),
    );
  }
}

// --- Column Widgets ---
class _ColumnContainer extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final int count;
  final Widget child;
  final Widget? trailing;

  const _ColumnContainer({
    required this.title,
    required this.icon,
    required this.color,
    required this.count,
    required this.child,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(AppSizes.spacingMedium),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSizes.radiusXLarge),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSizes.spacingXLarge),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(AppSizes.radiusXLarge),
                topRight: Radius.circular(AppSizes.radiusXLarge),
              ),
            ),
            child: Row(
              children: [
                Icon(icon, color: color, size: AppSizes.iconLarge),
                const SizedBox(width: AppSizes.spacingLarge),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: AppSizes.fontTitle,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                const Spacer(),
                if (trailing != null) ...[
                  trailing!,
                  const SizedBox(width: AppSizes.spacingMedium),
                ],
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSizes.spacingLarge,
                    vertical: AppSizes.spacingSmall,
                  ),
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius:
                        BorderRadius.circular(AppSizes.radiusXLarge),
                  ),
                  child: Text(
                    '$count',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: AppSizes.fontSubtitle,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _PendingColumn extends StatelessWidget {
  final OrderProvider provider;
  const _PendingColumn({required this.provider});

  @override
  Widget build(BuildContext context) {
    return _ColumnContainer(
      title: AppStrings.pendingSectionTitle,
      icon: Icons.pending_actions,
      color: AppColors.pendingSection,
      count: provider.pendingOrders.length,
      child: provider.pendingOrders.isEmpty
          ? EmptyStateWidget(
              icon: Icons.pending_actions,
              message: AppStrings.noPendingOrders,
              iconSize: AppSizes.iconEmptyStateLarge,
              fontSize: AppSizes.fontSubtitle,
            )
          : ListView.builder(
              padding: const EdgeInsets.all(AppSizes.spacingMedium),
              itemCount: provider.pendingOrders.length,
              itemBuilder: (context, index) {
                return OrderCard(
                  order: provider.pendingOrders[index],
                  showAnimation: index == 0,
                );
              },
            ),
    );
  }
}

class _BotsColumn extends StatelessWidget {
  final OrderProvider provider;
  const _BotsColumn({required this.provider});

  @override
  Widget build(BuildContext context) {
    return _ColumnContainer(
      title: AppStrings.botsSectionTitle,
      icon: Icons.smart_toy,
      color: AppColors.botsSection,
      count: provider.bots.length,
      child: provider.bots.isEmpty
          ? Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.smart_toy,
                    size: AppSizes.iconEmptyStateLarge,
                    color: AppColors.iconDisabled),
                const SizedBox(height: AppSizes.spacingXLarge),
                Text(
                  AppStrings.noBotsMessage,
                  style: TextStyle(
                    fontSize: AppSizes.fontSubtitle,
                    color: AppColors.textHint,
                  ),
                ),
                const SizedBox(height: AppSizes.spacingMedium),
                Text(
                  AppStrings.noBotsHintDesktop,
                  style: TextStyle(
                    fontSize: AppSizes.fontBodyMedium,
                    color: AppColors.textDisabled,
                  ),
                ),
              ],
            )
          : ListView.builder(
              padding: const EdgeInsets.all(AppSizes.spacingMedium),
              itemCount: provider.bots.length,
              itemBuilder: (context, index) {
                final bot = provider.bots[index];
                final currentOrder = provider.getOrderForBot(bot.id);
                return BotCard(bot: bot, currentOrder: currentOrder);
              },
            ),
    );
  }
}

class _CompletedColumn extends StatelessWidget {
  final OrderProvider provider;
  const _CompletedColumn({required this.provider});

  @override
  Widget build(BuildContext context) {
    return _ColumnContainer(
      title: AppStrings.completedSectionTitle,
      icon: Icons.check_circle,
      color: AppColors.completedSection,
      count: provider.completedOrders.length,
      trailing: provider.completedOrders.isNotEmpty
          ? ClearButton(
              onTap: () => _showClearDialog(context, provider),
            )
          : null,
      child: provider.completedOrders.isEmpty
          ? EmptyStateWidget(
              icon: Icons.check_circle,
              message: AppStrings.noCompletedOrdersYet,
              iconSize: AppSizes.iconEmptyStateLarge,
              fontSize: AppSizes.fontSubtitle,
            )
          : ListView.builder(
              padding: const EdgeInsets.all(AppSizes.spacingMedium),
              itemCount: provider.completedOrders.length,
              itemBuilder: (context, index) {
                return OrderCard(
                  order: provider.completedOrders[index],
                  showAnimation: index == 0,
                );
              },
            ),
    );
  }

  void _showClearDialog(BuildContext context, OrderProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(AppStrings.clearCompletedTitle),
        content: Text(
          AppStrings.clearCompletedMessage(provider.completedOrders.length),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(AppStrings.cancelLabel),
          ),
          TextButton(
            onPressed: () {
              provider.clearCompletedOrders();
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(AppStrings.completedOrdersCleared),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            child: const Text(AppStrings.clearLabel),
          ),
        ],
      ),
    );
  }
}

