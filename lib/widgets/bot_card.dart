import 'package:flutter/material.dart';
import '../constants/constants.dart';
import '../models/bot.dart';
import '../models/order.dart';

/// Reusable widget for displaying a bot card.
/// Adapts to compact (mobile) and default (tablet) sizing.
class BotCard extends StatelessWidget {
  final Bot bot;
  final Order? currentOrder;
  final bool isCompact;

  const BotCard({
    super.key,
    required this.bot,
    this.currentOrder,
    this.isCompact = false,
  });

  Color _getStatusColor() =>
      bot.isProcessing ? AppColors.processingColor : AppColors.idleColor;

  IconData _getStatusIcon() =>
      bot.isProcessing ? Icons.engineering : Icons.check_circle_outline;

  String _getStatusText() =>
      bot.isProcessing ? AppStrings.processingStatus : AppStrings.idleStatus;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(
        vertical: isCompact ? AppSizes.compactMarginV : AppSizes.defaultMarginV,
        horizontal: isCompact ? AppSizes.compactMarginH : AppSizes.defaultMarginH,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: bot.isProcessing
              ? [AppColors.processingBgStart, AppColors.processingBgEnd]
              : [AppColors.idleBgStart, AppColors.idleBgEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(
            isCompact ? AppSizes.radiusMedium : AppSizes.radiusXLarge),
        border: Border.all(
          color: _getStatusColor(),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(
                  Icons.smart_toy,
                  color: _getStatusColor(),
                  size: isCompact ? 20 : AppSizes.iconXLarge,
                ),
                SizedBox(width: isCompact ? AppSizes.spacingMedium : AppSizes.spacingLarge),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        AppStrings.botNumber(bot.botNumber),
                        style: TextStyle(
                          fontSize: isCompact ? AppSizes.fontBodyMedium : AppSizes.fontTitle,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: isCompact ? AppSizes.spacingXSmall : AppSizes.spacingSmall),
                      Row(
                        children: [
                          Icon(
                            _getStatusIcon(),
                            size: isCompact ? AppSizes.iconXSmall : AppSizes.iconSmall,
                            color: _getStatusColor(),
                          ),
                          SizedBox(width: isCompact ? AppSizes.spacingXSmall : AppSizes.spacingSmall),
                          Text(
                            _getStatusText(),
                            style: TextStyle(
                              fontSize: isCompact ? AppSizes.fontSmall : AppSizes.fontBodyMedium,
                              fontWeight: FontWeight.w600,
                              color: _getStatusColor(),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (bot.isProcessing && currentOrder != null) ...[
              SizedBox(height: isCompact ? 5 : AppSizes.spacingMedium),
              Container(
                padding: EdgeInsets.all(isCompact ? 5 : AppSizes.spacingMedium),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppSizes.radiusSmall),
                  border: Border.all(color: AppColors.surfaceBorder, width: 0.5),
                ),
                child: Row(
                  children: [
                    Icon(
                      currentOrder!.type == OrderType.vip
                          ? Icons.star
                          : Icons.fastfood,
                      size: isCompact ? AppSizes.iconSmall : AppSizes.iconMedium,
                      color: currentOrder!.type == OrderType.vip
                          ? AppColors.vipBorder
                          : AppColors.normalBorder,
                    ),
                    SizedBox(width: isCompact ? 5 : AppSizes.spacingMedium),
                    Expanded(
                      child: Text(
                        AppStrings.orderNumber(currentOrder!.orderNumber),
                        style: TextStyle(
                          fontSize: isCompact ? AppSizes.fontCaption : AppSizes.fontBodyLarge,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
