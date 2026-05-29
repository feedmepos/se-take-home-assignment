import 'package:flutter/material.dart';
import '../../models/order.dart';

class BotStatusWidget extends StatelessWidget {
  final Bot bot;

  const BotStatusWidget({
    super.key,
    required this.bot,
  });

  @override
  Widget build(BuildContext context) {
    final isProcessing = !bot.isIdle && bot.currentOrder != null;

    return Container(
      width: 110,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isProcessing
              ? const Color(0xFFFF9500).withOpacity(0.5)
              : const Color(0xFF34C759).withOpacity(0.4),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        spacing: 6,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                bot.displayId,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
              ),
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isProcessing
                      ? const Color(0xFFFF9500)
                      : const Color(0xFF34C759),
                ),
              ),
            ],
          ),
          if (isProcessing && bot.currentOrder != null)
            Column(
              spacing: 2,
              children: [
                Text(
                  'Processing',
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.orange.shade700,
                  ),
                ),
                Text(
                  bot.currentOrder!.displayId,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            )
          else
            const Text(
              'IDLE',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Color(0xFF34C759),
                letterSpacing: 0.5,
              ),
            ),
        ],
      ),
    );
  }
}
