import 'package:flutter/material.dart';
import '../constants/constants.dart';

/// Reusable widget for displaying statistics (tablet layout).
class StatsCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const StatsCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSizes.spacingXLarge),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppSizes.radiusXLarge),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: AppSizes.defaultBorderWidth,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(height: AppSizes.spacingMedium),
          Text(
            value,
            style: TextStyle(
              fontSize: AppSizes.fontDisplay,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: AppSizes.spacingSmall),
          Text(
            title,
            style: TextStyle(
              fontSize: AppSizes.fontBodyMedium,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
