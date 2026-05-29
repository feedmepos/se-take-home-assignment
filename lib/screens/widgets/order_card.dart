import 'package:flutter/material.dart';
import '../../models/order.dart';

class OrderCard extends StatelessWidget {
  final Order order;
  final int index;

  const OrderCard({
    super.key,
    required this.order,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    final isVIP = order.type == OrderType.vip;
    final isComplete = order.status == OrderStatus.complete;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isVIP
              ? const Color(0xFF9B59B6).withOpacity(0.4)
              : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 8,
          children: [
            Row(
              children: [
                Text(
                  order.displayId,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(width: 8),
                _TypeBadge(isVIP: isVIP),
                const Spacer(),
                _StatusBadge(isComplete: isComplete),
              ],
            ),
            Container(
              height: 1,
              color: Colors.grey.shade100,
            ),
            Row(
              children: [
                _TimeItem(
                  icon: Icons.schedule_rounded,
                  label: 'Created',
                  time: order.createdTimeString,
                  color: Colors.grey.shade600,
                ),
                if (isComplete) ...[
                  const SizedBox(width: 12),
                  _TimeItem(
                    icon: Icons.check_circle_outline_rounded,
                    label: 'Done',
                    time: order.completedTimeString,
                    color: const Color(0xFF34C759),
                  ),
                  const SizedBox(width: 12),
                  _TimeItem(
                    icon: Icons.timer_outlined,
                    label: 'Duration',
                    time: _duration(order.createdAt, order.completedAt!),
                    color: const Color(0xFF007AFF),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _duration(DateTime start, DateTime end) {
    return '${end.difference(start).inSeconds}s';
  }
}

class _TypeBadge extends StatelessWidget {
  final bool isVIP;
  const _TypeBadge({required this.isVIP});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: isVIP
            ? const Color(0xFF9B59B6).withOpacity(0.12)
            : const Color(0xFF007AFF).withOpacity(0.10),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 3,
        children: [
          Icon(
            isVIP ? Icons.star_rounded : Icons.person_rounded,
            size: 10,
            color: isVIP ? const Color(0xFF9B59B6) : const Color(0xFF007AFF),
          ),
          Text(
            isVIP ? 'VIP' : 'Normal',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color:
                  isVIP ? const Color(0xFF9B59B6) : const Color(0xFF007AFF),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final bool isComplete;
  const _StatusBadge({required this.isComplete});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isComplete
            ? const Color(0xFF34C759).withOpacity(0.12)
            : const Color(0xFFFF9500).withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        isComplete ? 'Complete' : 'Pending',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: isComplete
              ? const Color(0xFF34C759)
              : const Color(0xFFFF9500),
        ),
      ),
    );
  }
}

class _TimeItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String time;
  final Color color;

  const _TimeItem({
    required this.icon,
    required this.label,
    required this.time,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      spacing: 4,
      children: [
        Icon(icon, size: 11, color: color),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 9,
                color: Colors.grey.shade400,
              ),
            ),
            Text(
              time,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
