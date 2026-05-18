import 'package:flutter/material.dart';

/// Centralized color constants for the application.
/// Single source of truth for all colors used in the UI.
abstract class AppColors {
  // Brand
  static const Color primary = Color(0xFFC62828); // Colors.red.shade700 equiv
  static final Color primaryLight = Colors.red.shade700;

  // Order Types
  static final Color vipCard = Colors.amber.shade50;
  static final Color vipBorder = Colors.amber.shade700;
  static final Color normalCard = Colors.green.shade50;
  static final Color normalBorder = Colors.green.shade700;

  // Bot Status
  static final Color processingColor = Colors.orange.shade700;
  static final Color idleColor = Colors.blue.shade700;
  static final Color processingBgStart = Colors.orange.shade50;
  static final Color processingBgEnd = Colors.orange.shade100;
  static final Color idleBgStart = Colors.blue.shade50;
  static final Color idleBgEnd = Colors.blue.shade100;

  // Section Colors
  static const Color botsSection = Colors.blue;
  static const Color pendingSection = Colors.orange;
  static const Color completedSection = Colors.green;
  static const Color activeSection = Colors.purple;

  // Button Colors
  static const Color normalOrderButton = Colors.green;
  static final Color vipOrderButton = Colors.amber.shade700;
  static const Color addBotButton = Colors.blue;
  static const Color removeBotButton = Colors.red;
  static final Color clearButton = Colors.red.shade400;

  // Neutral
  static final Color textPrimary = Colors.grey.shade800;
  static final Color textSecondary = Colors.grey.shade600;
  static final Color textHint = Colors.grey.shade500;
  static final Color textDisabled = Colors.grey.shade400;
  static final Color iconDisabled = Colors.grey.shade300;
  static final Color surfaceBorder = Colors.grey.shade300;
  static const Color surface = Colors.white;
  static final Color background = Colors.grey.shade100;

  // Shadows
  static Color shadow(double opacity) => Colors.black.withOpacity(opacity);
}

