import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/order_controller.dart';
import '../models/order.dart';
import 'widgets/order_card.dart';
import 'widgets/bot_status.dart';
import '../../app.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _buildAppBar(),
      body: Consumer<OrderController>(
        builder: (context, controller, _) {
          return Column(
            children: [
              _buildControlPanel(context, controller),
              if (controller.activeBots.isNotEmpty)
                _buildBotSection(controller),
              Expanded(
                child: Row(
                  children: [
                    Expanded(
                      child: _buildOrderColumn(
                        title: 'PENDING',
                        count: controller.pendingOrders.length,
                        orders: controller.pendingOrders,
                        accentColor: const Color(0xFFFF9500),
                        icon: Icons.hourglass_top_rounded,
                      ),
                    ),
                    Container(width: 1, color: const Color(0xFFE0E0E0)),
                    Expanded(
                      child: _buildOrderColumn(
                        title: 'COMPLETE',
                        count: controller.completeOrders.length,
                        orders: controller.completeOrders,
                        accentColor: const Color(0xFF34C759),
                        icon: Icons.check_circle_rounded,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: mcRed,
      title: const Row(
        children: [
          Text('🍔', style: TextStyle(fontSize: 22)),
          SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'FeedMe',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              Text(
                'Order Management',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildControlPanel(BuildContext context, OrderController controller) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        spacing: 12,
        children: [
          Row(
            spacing: 10,
            children: [
              Expanded(
                child: _ActionButton(
                  label: 'Normal Order',
                  icon: Icons.person_outline,
                  color: const Color(0xFF007AFF),
                  onTap: controller.addNormalOrder,
                ),
              ),
              Expanded(
                child: _ActionButton(
                  label: 'VIP Order',
                  icon: Icons.star_rounded,
                  color: const Color(0xFF9B59B6),
                  onTap: controller.addVIPOrder,
                ),
              ),
            ],
          ),
          Row(
            spacing: 10,
            children: [
              Expanded(
                child: _ActionButton(
                  label: '+ Add Bot',
                  icon: Icons.smart_toy_outlined,
                  color: const Color(0xFF34C759),
                  onTap: controller.addBot,
                ),
              ),
              Expanded(
                child: _ActionButton(
                  label: '- Remove Bot',
                  icon: Icons.smart_toy_outlined,
                  color: const Color(0xFFFF3B30),
                  onTap: controller.activeBots.isNotEmpty
                      ? controller.removeBot
                      : null,
                ),
              ),
            ],
          ),
          _buildStats(controller),
        ],
      ),
    );
  }

  Widget _buildStats(OrderController controller) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F4F4),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          _StatChip(
            label: 'Total',
            value: '${controller.getAllOrders().length}',
            color: mcDark,
          ),
          _StatDivider(),
          _StatChip(
            label: 'Pending',
            value: '${controller.pendingOrders.length}',
            color: const Color(0xFFFF9500),
          ),
          _StatDivider(),
          _StatChip(
            label: 'Complete',
            value: '${controller.completeOrders.length}',
            color: const Color(0xFF34C759),
          ),
          _StatDivider(),
          _StatChip(
            label: 'Bots',
            value: '${controller.activeBots.length}',
            color: const Color(0xFF007AFF),
          ),
        ],
      ),
    );
  }

  Widget _buildBotSection(OrderController controller) {
    return Container(
      color: const Color(0xFFFFF8E1),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 8,
        children: [
          Row(
            children: [
              const Icon(Icons.smart_toy_rounded,
                  size: 14, color: Color(0xFF856404)),
              const SizedBox(width: 6),
              Text(
                'ACTIVE BOTS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF856404),
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              spacing: 8,
              children: controller.activeBots
                  .map((bot) => BotStatusWidget(bot: bot))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderColumn({
    required String title,
    required int count,
    required List<Order> orders,
    required Color accentColor,
    required IconData icon,
  }) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: Colors.white,
          child: Row(
            children: [
              Icon(icon, size: 16, color: accentColor),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  letterSpacing: 0.5,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    color: accentColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
        Container(height: 1, color: const Color(0xFFE0E0E0)),
        Expanded(
          child: orders.isEmpty
              ? _buildEmptyState(title)
              : ListView.builder(
                  padding: const EdgeInsets.all(10),
                  itemCount: orders.length,
                  itemBuilder: (context, index) => OrderCard(
                    order: orders[index],
                    index: index + 1,
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(String area) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        spacing: 8,
        children: [
          Icon(Icons.inbox_rounded, size: 36, color: Colors.grey.shade300),
          Text(
            'No orders',
            style: TextStyle(
              color: Colors.grey.shade400,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabled = onTap == null;
    return Material(
      color: isDisabled ? Colors.grey.shade200 : color,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            spacing: 6,
            children: [
              Icon(
                icon,
                size: 16,
                color: isDisabled ? Colors.grey.shade400 : Colors.white,
              ),
              Text(
                label,
                style: TextStyle(
                  color: isDisabled ? Colors.grey.shade400 : Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatChip({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 30,
      color: Colors.grey.shade300,
    );
  }
}
