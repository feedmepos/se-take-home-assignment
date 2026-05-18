import 'package:flutter/material.dart';
import '../../constants/constants.dart';

/// A reusable empty state placeholder widget.
/// Shows an icon and message when a list has no items.
class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String message;
  final double iconSize;
  final double fontSize;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.message,
    this.iconSize = AppSizes.iconEmptyState,
    this.fontSize = AppSizes.fontBody,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSizes.spacingXLarge),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: iconSize, color: AppColors.iconDisabled),
          const SizedBox(height: AppSizes.spacingMedium),
          Text(
            message,
            style: TextStyle(
              fontSize: fontSize,
              color: AppColors.textHint,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

