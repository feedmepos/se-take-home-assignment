import 'package:flutter/material.dart';
import '../constants/constants.dart';
import 'components/mobile_layout.dart';
import 'components/landscape_layout.dart';
import 'components/tablet_layout.dart';

/// Main screen — acts as a thin orchestrator that selects the
/// correct layout based on screen size and orientation.
///
/// All layout logic is delegated to dedicated layout widgets so
/// this file stays small and each layout can evolve independently.
class OrderManagementScreen extends StatelessWidget {
  const OrderManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: _buildAppBar(context),
      body: SafeArea(
        child: _resolveLayout(context),
      ),
      bottomNavigationBar: _buildFooter(),
    );
  }

  Widget _buildFooter() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow(0.05),
            blurRadius: 4,
            offset: const Offset(0, -1),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Text(
            AppStrings.appTitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: AppSizes.fontCaption,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < AppSizes.smallScreenMaxWidth;

    return AppBar(
      elevation: 0,
      backgroundColor: AppColors.primaryLight,
      title: Row(
        children: [
          Icon(Icons.restaurant, size: isSmall ? 18 : 22),
          SizedBox(width: isSmall ? 6 : 8),
          Flexible(
            child: Text(
              AppStrings.appBarTitle,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: isSmall ? 14 : AppSizes.fontTitle,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  /// Chooses layout based on device dimensions and orientation.
  ///
  /// Uses [size.shortestSide] to distinguish a phone rotated to landscape
  /// (shortestSide ≈ 360-450) from a true tablet (shortestSide ≥ 600).
  /// Without this, a phone in landscape may have width ≥ 900 and incorrectly
  /// receive the tablet layout, causing vertical overflow.
  Widget _resolveLayout(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final orientation = MediaQuery.of(context).orientation;
    final shortestSide = size.shortestSide;

    // True tablets / desktops have a large shortest side.
    final isTablet = shortestSide >= AppSizes.tabletShortestSide;
    final isLandscape = orientation == Orientation.landscape && !isTablet;

    if (isTablet) return const TabletLayout();
    if (isLandscape) return const LandscapeLayout();
    return const MobileLayout();
  }
}
