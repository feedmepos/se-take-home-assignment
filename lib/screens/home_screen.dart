import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/order_controller.dart';
import '../models/order.dart';
import 'widgets/order_card.dart';
import 'widgets/bot_status.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('🍔 McDonald\'s Order Management'),
            Text(
              'Automated Cooking Bot System',
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
      ),
      body: Consumer<OrderController>(
        builder: (context, controller, _) {
          return Column(
            children: [
              // Control Panel
              _buildControlPanel(context, controller),
              
              // Bot Status
              _buildBotStatus(context, controller),
              
              // Main Content: Pending and Complete areas
              Expanded(
                child: Row(
                  children: [
                    // Pending Orders Section
                    Expanded(
                      child: _buildOrderArea(
                        title: 'PENDING ORDERS',
                        orders: controller.pendingOrders,
                        color: Colors.orange,
                      ),
                    ),
                    
                    // Divider
                    Container(
                      width: 2,
                      color: Colors.grey.shade300,
                    ),
                    
                    // Complete Orders Section
                    Expanded(
                      child: _buildOrderArea(
                        title: 'COMPLETE ORDERS',
                        orders: controller.completeOrders,
                        color: Colors.green,
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

  Widget _buildControlPanel(BuildContext context, OrderController controller) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Column(
        spacing: 12,
        children: [
          // Order Creation Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton.icon(
                onPressed: () => controller.addNormalOrder(),
                icon: const Icon(Icons.person),
                label: const Text('New Normal Order'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
              ElevatedButton.icon(
                onPressed: () => controller.addVIPOrder(),
                icon: const Icon(Icons.star),
                label: const Text('New VIP Order'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  backgroundColor: Colors.purple,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
          
          // Bot Management Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton.icon(
                onPressed: () => controller.addBot(),
                icon: const Icon(Icons.add),
                label: const Text('+ Bot'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                ),
              ),
              ElevatedButton.icon(
                onPressed: controller.activeBots.isNotEmpty
                    ? () => controller.removeBot()
                    : null,
                icon: const Icon(Icons.remove),
                label: const Text('- Bot'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  backgroundColor: Colors.red,
                  disabledBackgroundColor: Colors.grey.shade300,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),

          // Statistics
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatItem(
                label: 'Total Orders',
                value: '${controller.getAllOrders().length}',
              ),
              _buildStatItem(
                label: 'Pending',
                value: '${controller.pendingOrders.length}',
                color: Colors.orange,
              ),
              _buildStatItem(
                label: 'Complete',
                value: '${controller.completeOrders.length}',
                color: Colors.green,
              ),
              _buildStatItem(
                label: 'Active Bots',
                value: '${controller.activeBots.length}',
                color: Colors.blue,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required String label,
    required String value,
    Color? color,
  }) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color ?? Colors.grey,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  Widget _buildBotStatus(BuildContext context, OrderController controller) {
    if (controller.activeBots.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        border: Border(bottom: BorderSide(color: Colors.blue.shade200)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          spacing: 12,
          children: [
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: Text(
                'Bots:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            ...controller.activeBots.map((bot) => BotStatusWidget(bot: bot)),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderArea({
    required String title,
    required List<Order> orders,
    required Color color,
  }) {
    return Container(
      color: color.withOpacity(0.05),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color,
              border: Border(bottom: BorderSide(color: color.withOpacity(0.5))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${orders.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Orders List
          Expanded(
            child: orders.isEmpty
                ? Center(
                    child: Text(
                      'No orders',
                      style: TextStyle(
                        color: Colors.grey.shade400,
                        fontSize: 14,
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: orders.length,
                    itemBuilder: (context, index) {
                      return OrderCard(
                        order: orders[index],
                        index: index + 1,
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
