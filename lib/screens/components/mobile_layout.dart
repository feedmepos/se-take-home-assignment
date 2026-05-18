import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/constants.dart';
import '../../common/widgets/common_widgets.dart';
import '../../providers/order_provider.dart';
import '../../widgets/order_card.dart';
import '../../widgets/bot_card.dart';
import 'mobile_control_panel.dart';
import 'mobile_stats_dashboard.dart';

/// Mobile portrait layout.
/// Control panel and stats stay fixed at top.
/// Bots, Pending, Completed sections scroll below.
class MobileLayout extends StatelessWidget {
  const MobileLayout({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const MobileControlPanel(),
        const MobileStatsDashboard(),
        Expanded(
          child: Consumer<OrderProvider>(
            builder: (context, provider, _) {
              return SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    _buildBotsSection(provider),
                    _buildPendingSection(provider),
                    _buildCompletedSection(context, provider),
                    const SizedBox(height: 60),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildBotsSection(OrderProvider provider) {
    return SectionContainer(
      title: AppStrings.botsSectionTitle,
      icon: Icons.smart_toy,
      color: AppColors.botsSection,
      count: provider.bots.length,
      child: provider.bots.isEmpty
          ? const EmptyStateWidget(
              icon: Icons.smart_toy,
              message: AppStrings.noBotsHintMobile,
            )
          : ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.spacingSmall,
                vertical: AppSizes.spacingSmall,
              ),
              itemCount: provider.bots.length,
              itemBuilder: (context, index) {
                final bot = provider.bots[index];
                final currentOrder = provider.getOrderForBot(bot.id);
                return BotCard(
                  bot: bot,
                  currentOrder: currentOrder,
                  isCompact: true,
                );
              },
            ),
    );
  }

  Widget _buildPendingSection(OrderProvider provider) {
    return SectionContainer(
      title: AppStrings.pendingSectionTitle,
      icon: Icons.pending_actions,
      color: AppColors.pendingSection,
      count: provider.pendingOrders.length,
      child: provider.pendingOrders.isEmpty
          ? const EmptyStateWidget(
              icon: Icons.pending_actions,
              message: AppStrings.noPendingOrders,
            )
          : ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.spacingSmall,
                vertical: AppSizes.spacingSmall,
              ),
              itemCount: provider.pendingOrders.length,
              itemBuilder: (context, index) {
                return OrderCard(
                  order: provider.pendingOrders[index],
                  isCompact: true,
                  showAnimation: index == 0,
                );
              },
            ),
    );
  }

  Widget _buildCompletedSection(
      BuildContext context, OrderProvider provider) {
    return SectionContainer(
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
          ? const EmptyStateWidget(
              icon: Icons.check_circle,
              message: AppStrings.noCompletedOrders,
            )
          : ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.spacingSmall,
                vertical: AppSizes.spacingSmall,
              ),
              itemCount: provider.completedOrders.length,
              itemBuilder: (context, index) {
                return OrderCard(
                  order: provider.completedOrders[index],
                  isCompact: true,
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

