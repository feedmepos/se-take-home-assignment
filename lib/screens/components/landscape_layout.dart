import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/constants.dart';
import '../../common/widgets/common_widgets.dart';
import '../../providers/order_provider.dart';
import '../../widgets/order_card.dart';
import '../../widgets/bot_card.dart';

/// Landscape layout for phones rotated sideways.
/// Left sidebar: controls + stats (scrollable).
/// Right: 3 equal scrollable columns (Pending, Bots, Done).
class LandscapeLayout extends StatelessWidget {
  const LandscapeLayout({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<OrderProvider>(
      builder: (context, provider, _) {
        return Row(
          children: [
            _Sidebar(provider: provider),
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

// --- Sidebar ---
class _Sidebar extends StatelessWidget {
  final OrderProvider provider;
  const _Sidebar({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: AppSizes.landscapeSidebarWidth,
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow(0.05),
            blurRadius: 4,
            offset: const Offset(2, 0),
          ),
        ],
      ),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          children: [
            _Controls(provider: provider),
            const Divider(height: 8, thickness: 1),
            _Stats(provider: provider),
          ],
        ),
      ),
    );
  }
}

class _Controls extends StatelessWidget {
  final OrderProvider provider;
  const _Controls({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _SidebarButton(
            label: AppStrings.normalLabel,
            icon: Icons.fastfood,
            color: AppColors.normalOrderButton,
            onPressed: provider.createNormalOrder,
          ),
          const SizedBox(height: 3),
          _SidebarButton(
            label: AppStrings.vipLabel,
            icon: Icons.star,
            color: AppColors.vipOrderButton,
            onPressed: provider.createVipOrder,
          ),
          const SizedBox(height: 3),
          _SidebarButton(
            label: AppStrings.botLabel,
            icon: Icons.add,
            color: AppColors.addBotButton,
            onPressed: provider.addBot,
          ),
          const SizedBox(height: 3),
          _SidebarButton(
            label: AppStrings.botLabel,
            icon: Icons.remove,
            color: AppColors.removeBotButton,
            onPressed: () {
              final removed = provider.removeBot();
              if (!removed) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(AppStrings.noBotsToRemove),
                    duration: Duration(seconds: 1),
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }
}

class _SidebarButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  const _SidebarButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSizes.radiusMedium - 1),
        ),
        elevation: 1,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: AppSizes.iconSmall),
          const SizedBox(width: AppSizes.spacingSmall),
          Text(
            label,
            style: const TextStyle(
              fontSize: AppSizes.fontCaption,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _Stats extends StatelessWidget {
  final OrderProvider provider;
  const _Stats({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(6),
      child: Column(
        children: [
          _StatRow(AppStrings.pendingStatLabel, provider.totalPendingOrders,
              Icons.pending, AppColors.pendingSection),
          const SizedBox(height: 3),
          _StatRow(AppStrings.botsStatLabel, provider.totalBots,
              Icons.smart_toy, AppColors.botsSection),
          const SizedBox(height: 3),
          _StatRow(AppStrings.activeStatLabel, provider.activeBots,
              Icons.engineering, AppColors.activeSection),
          const SizedBox(height: 3),
          _StatRow(AppStrings.completedStatLabel, provider.totalCompletedOrders,
              Icons.check_circle, AppColors.completedSection),
        ],
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  const _StatRow(this.label, this.value, this.icon, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppSizes.radiusSmall),
        border: Border.all(color: color.withOpacity(0.3), width: 0.5),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: AppSizes.iconSmall),
          const SizedBox(width: AppSizes.spacingSmall),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: AppSizes.fontXSmall,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  '$value',
                  style: TextStyle(
                    fontSize: AppSizes.fontSubtitle,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// --- Columns ---
class _CompactColumn extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final int count;
  final Widget child;
  final Widget? trailing;

  const _CompactColumn({
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
      margin: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSizes.radiusMedium),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow(0.05),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(AppSizes.radiusMedium),
                topRight: Radius.circular(AppSizes.radiusMedium),
              ),
            ),
            child: Row(
              children: [
                Icon(icon, color: color, size: AppSizes.iconSmall),
                const SizedBox(width: AppSizes.spacingSmall),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: AppSizes.fontCaption,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ),
                if (trailing != null) ...[
                  trailing!,
                  const SizedBox(width: AppSizes.spacingSmall),
                ],
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(AppSizes.radiusMedium),
                  ),
                  child: Text(
                    '$count',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: AppSizes.fontSmall,
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
    return _CompactColumn(
      title: AppStrings.pendingSectionTitle,
      icon: Icons.pending_actions,
      color: AppColors.pendingSection,
      count: provider.pendingOrders.length,
      child: provider.pendingOrders.isEmpty
          ? const EmptyStateWidget(
              icon: Icons.pending_actions,
              message: AppStrings.noPendingShort,
            )
          : ListView.builder(
              padding: const EdgeInsets.all(3),
              itemCount: provider.pendingOrders.length,
              itemBuilder: (context, index) {
                return OrderCard(
                  order: provider.pendingOrders[index],
                  isCompact: true,
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
    return _CompactColumn(
      title: AppStrings.botsSectionTitle,
      icon: Icons.smart_toy,
      color: AppColors.botsSection,
      count: provider.bots.length,
      child: provider.bots.isEmpty
          ? const EmptyStateWidget(
              icon: Icons.smart_toy,
              message: AppStrings.noBotsShort,
            )
          : ListView.builder(
              padding: const EdgeInsets.all(3),
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
}

class _CompletedColumn extends StatelessWidget {
  final OrderProvider provider;
  const _CompletedColumn({required this.provider});

  @override
  Widget build(BuildContext context) {
    return _CompactColumn(
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
              message: AppStrings.noCompletedShort,
            )
          : ListView.builder(
              padding: const EdgeInsets.all(3),
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

