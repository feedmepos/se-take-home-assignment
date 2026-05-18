import 'package:flutter/material.dart';
import '../../constants/constants.dart';

/// A reusable clear button widget shown in section headers.
/// Tapping it triggers the provided callback (typically shows a confirmation dialog).
class ClearButton extends StatelessWidget {
  final VoidCallback onTap;

  const ClearButton({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.clearButton,
          borderRadius: BorderRadius.circular(AppSizes.radiusLarge),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.delete_sweep, color: Colors.white, size: 14),
            SizedBox(width: AppSizes.spacingSmall),
            Text(
              AppStrings.clearLabel,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: AppSizes.fontBody,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

