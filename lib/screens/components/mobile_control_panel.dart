import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/constants.dart';
import '../../providers/order_provider.dart';

/// Fixed control panel with action buttons for mobile portrait layout.
/// Stays pinned at the top while content scrolls below.
class MobileControlPanel extends StatelessWidget {
  const MobileControlPanel({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.read<OrderProvider>();
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < AppSizes.smallScreenMaxWidth;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isSmall ? 6 : 8,
        vertical: isSmall ? 6 : 8,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow(0.05),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          _ActionButton(
            label: AppStrings.normalLabel,
            icon: Icons.fastfood,
            color: AppColors.normalOrderButton,
            onPressed: provider.createNormalOrder,
            isSmall: isSmall,
          ),
          SizedBox(width: isSmall ? 3 : 4),
          _ActionButton(
            label: AppStrings.vipLabel,
            icon: Icons.star,
            color: AppColors.vipOrderButton,
            onPressed: provider.createVipOrder,
            isSmall: isSmall,
          ),
          SizedBox(width: isSmall ? 3 : 4),
          _ActionButton(
            label: AppStrings.botLabel,
            icon: Icons.add,
            color: AppColors.addBotButton,
            onPressed: provider.addBot,
            isSmall: isSmall,
          ),
          SizedBox(width: isSmall ? 3 : 4),
          _ActionButton(
            label: AppStrings.botLabel,
            icon: Icons.remove,
            color: AppColors.removeBotButton,
            onPressed: () {
              final removed = provider.removeBot();
              if (!removed) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text(AppStrings.noBotsToRemove),
                    duration: const Duration(seconds: 1),
                    behavior: SnackBarBehavior.floating,
                    margin: const EdgeInsets.all(AppSizes.spacingMedium),
                  ),
                );
              }
            },
            isSmall: isSmall,
          ),
        ],
      ),
    );
  }
}

/// Private action button used in the control panel.
class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;
  final bool isSmall;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
    required this.isSmall,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: EdgeInsets.symmetric(
            vertical: isSmall ? 6 : 8,
            horizontal: isSmall ? 2 : 4,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSizes.radiusMedium - 1),
          ),
          elevation: 1,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: isSmall ? 16 : AppSizes.iconMedium),
            SizedBox(height: isSmall ? 2 : 3),
            Text(
              label,
              style: TextStyle(
                fontSize: isSmall ? AppSizes.fontXSmall : AppSizes.fontSmall,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

