import 'package:intl/intl.dart';

enum OrderType { normal, vip }

enum OrderStatus { pending, complete }

class Order {
  final int id;
  final OrderType type;
  OrderStatus status;
  final DateTime createdAt;
  DateTime? completedAt;

  Order({
    required this.id,
    required this.type,
    this.status = OrderStatus.pending,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  String get displayId => '#${id.toString().padLeft(4, '0')}';
  
  String get typeLabel => type == OrderType.vip ? 'VIP' : 'NORMAL';
  
  String get createdTimeString => _formatTime(createdAt);
  
  String get completedTimeString => completedAt != null ? _formatTime(completedAt!) : '-';

  String _formatTime(DateTime time) {
    return DateFormat('HH:mm:ss').format(time);
  }

  @override
  String toString() => 'Order(id: $id, type: $typeLabel, status: ${status.name})';
}

class Bot {
  final int id;
  DateTime createdAt;
  Order? currentOrder;
  DateTime? processingStartedAt;
  bool isIdle = true;

  Bot({
    required this.id,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  String get displayId => 'BOT-${id.toString().padLeft(3, '0')}';

  @override
  String toString() => 'Bot(id: $id, isIdle: $isIdle)';
}
