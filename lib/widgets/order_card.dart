import 'package:flutter/material.dart';
import '../constants/constants.dart';
import '../models/order.dart';

/// Reusable widget for displaying an order card.
/// Adapts to compact (mobile) and default (tablet) sizing.
class OrderCard extends StatelessWidget {
  final Order order;
  final bool showAnimation;
  final bool isCompact;

  const OrderCard({
    super.key,
    required this.order,
    this.showAnimation = false,
    this.isCompact = false,
  });

  Color _getCardColor() =>
      order.type == OrderType.vip ? AppColors.vipCard : AppColors.normalCard;

  Color _getBorderColor() =>
      order.type == OrderType.vip ? AppColors.vipBorder : AppColors.normalBorder;

  IconData _getIcon() =>
      order.type == OrderType.vip ? Icons.star : Icons.fastfood;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      margin: EdgeInsets.symmetric(
        vertical: isCompact ? AppSizes.compactMarginV : AppSizes.defaultMarginV,
        horizontal: isCompact ? AppSizes.compactMarginH : AppSizes.defaultMarginH,
      ),
      decoration: BoxDecoration(
        color: _getCardColor(),
        borderRadius: BorderRadius.circular(
            isCompact ? AppSizes.radiusMedium : AppSizes.radiusXLarge),
        border: Border.all(
          color: _getBorderColor(),
          width: isCompact ? AppSizes.compactBorderWidth : AppSizes.defaultBorderWidth,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow(0.05),
            blurRadius: isCompact ? 1 : 4,
            offset: Offset(0, isCompact ? 1 : 2),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.all(
            isCompact ? AppSizes.compactPadding : AppSizes.defaultPadding),
        child: Row(
          children: [
            Icon(
              _getIcon(),
              color: _getBorderColor(),
              size: isCompact ? 20 : AppSizes.iconXLarge,
            ),
            SizedBox(width: isCompact ? AppSizes.spacingMedium : AppSizes.spacingLarge),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    AppStrings.orderNumber(order.orderNumber),
                    style: TextStyle(
                      fontSize: isCompact ? AppSizes.fontBodyMedium : AppSizes.fontTitle,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: isCompact ? AppSizes.spacingXSmall : AppSizes.spacingSmall),
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: isCompact ? 5 : AppSizes.spacingMedium,
                      vertical: isCompact ? 1 : 2,
                    ),
                    decoration: BoxDecoration(
                      color: _getBorderColor(),
                      borderRadius: BorderRadius.circular(AppSizes.radiusSmall),
                    ),
                    child: Text(
                      order.typeDisplay,
                      style: TextStyle(
                        fontSize: isCompact ? AppSizes.fontSmall : AppSizes.fontBodyMedium,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (order.status == OrderStatus.completed)
              Icon(
                Icons.check_circle,
                color: AppColors.normalBorder,
                size: isCompact ? AppSizes.iconMedium : AppSizes.iconLarge,
              ),
          ],
        ),
      ),
    );

    if (showAnimation) {
      return TweenAnimationBuilder<double>(
        tween: Tween(begin: 0.0, end: 1.0),
        duration: const Duration(milliseconds: 300),
        builder: (context, value, child) {
          return Transform.scale(
            scale: value,
            child: Opacity(opacity: value, child: child),
          );
        },
        child: card,
      );
    }

    return card;
  }
}
