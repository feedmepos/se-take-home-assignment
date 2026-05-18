import 'package:flutter/material.dart';
import '../../constants/constants.dart';

/// A reusable section container with a colored header.
/// Used across mobile, landscape, and tablet layouts.
class SectionContainer extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final int count;
  final Widget child;
  final Widget? trailing;

  const SectionContainer({
    super.key,
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
      margin: const EdgeInsets.only(
        top: AppSizes.spacingMedium,
        left: AppSizes.spacingMedium,
        right: AppSizes.spacingMedium,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSizes.radiusXLarge),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow(0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildHeader(),
          child,
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSizes.spacingXLarge,
        vertical: AppSizes.spacingLarge,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(AppSizes.radiusXLarge),
          topRight: Radius.circular(AppSizes.radiusXLarge),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: AppSizes.iconDefault),
          const SizedBox(width: AppSizes.spacingLarge - 2),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: AppSizes.fontSubtitle,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
          if (trailing != null)
            Padding(
              padding: const EdgeInsets.only(right: AppSizes.spacingMedium),
              child: trailing!,
            ),
          _buildCountBadge(),
        ],
      ),
    );
  }

  Widget _buildCountBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppSizes.radiusXLarge),
      ),
      child: Text(
        '$count',
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: AppSizes.fontBodyLarge,
        ),
      ),
    );
  }
}

