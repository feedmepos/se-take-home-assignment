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
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isProcessing ? Colors.orange.shade100 : Colors.green.shade100,
        border: Border.all(
          color: isProcessing ? Colors.orange : Colors.green,
          width: 2,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        spacing: 4,
        children: [
          Text(
            bot.displayId,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
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
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    color: Colors.orange.shade900,
                  ),
                ),
              ],
            )
          else
            Text(
              'IDLE',
              style: TextStyle(
                fontSize: 10,
                color: Colors.green.shade700,
                fontWeight: FontWeight.w600,
              ),
            ),
        ],
      ),
    );
  }
}
