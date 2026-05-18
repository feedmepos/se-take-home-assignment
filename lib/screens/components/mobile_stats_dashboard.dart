import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/constants.dart';
import '../../providers/order_provider.dart';

/// Compact stats dashboard for mobile portrait layout.
/// Shows key metrics (Pending, Bots, Active, Done) in a row.
class MobileStatsDashboard extends StatelessWidget {
  const MobileStatsDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OrderProvider>();

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSizes.spacingLarge,
        vertical: AppSizes.spacingLarge,
      ),
      color: AppColors.surface,
      child: Row(
        children: [
          _CompactStat(
            label: AppStrings.pendingStatLabel,
            value: provider.totalPendingOrders,
            icon: Icons.pending,
            color: AppColors.pendingSection,
          ),
          _CompactStat(
            label: AppStrings.botsStatLabel,
            value: provider.totalBots,
            icon: Icons.smart_toy,
            color: AppColors.botsSection,
          ),
          _CompactStat(
            label: AppStrings.activeStatLabel,
            value: provider.activeBots,
            icon: Icons.engineering,
            color: AppColors.activeSection,
          ),
          _CompactStat(
            label: AppStrings.completedStatLabel,
            value: provider.totalCompletedOrders,
            icon: Icons.check_circle,
            color: AppColors.completedSection,
          ),
        ],
      ),
    );
  }
}

class _CompactStat extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  const _CompactStat({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: AppSizes.iconLarge),
          const SizedBox(height: AppSizes.spacingSmall),
          Text(
            '$value',
            style: TextStyle(
              fontSize: AppSizes.fontHeadline,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: AppSizes.fontCaption,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

