import '../constants/app_strings.dart';

/// Represents the type of customer placing the order
enum OrderType {
  normal,
  vip;

  /// Display label for the order type
  String get displayName {
    switch (this) {
      case OrderType.vip:
        return AppStrings.vipTypeDisplay;
      case OrderType.normal:
        return AppStrings.normalTypeDisplay;
    }
  }
}

/// Represents the current status of an order
enum OrderStatus {
  pending,
  processing,
  completed,
}

/// Domain model representing a McDonald's order
class Order {
  final String id;
  final int orderNumber;
  final OrderType type;
  final OrderStatus status;
  final DateTime createdAt;
  final String? processingBotId;

  Order({
    required this.id,
    required this.orderNumber,
    required this.type,
    this.status = OrderStatus.pending,
    required this.createdAt,
    this.processingBotId,
  });

  /// Creates a copy of the order with updated fields
  Order copyWith({
    String? id,
    int? orderNumber,
    OrderType? type,
    OrderStatus? status,
    DateTime? createdAt,
    String? processingBotId,
  }) {
    return Order(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      type: type ?? this.type,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      processingBotId: processingBotId ?? this.processingBotId,
    );
  }

  /// Gets the display name for the order type
  String get typeDisplay => type.displayName;

  /// Gets the color associated with the order type
  String get typeColorHex => type == OrderType.vip ? '#FFD700' : '#90EE90';

  @override
  String toString() {
    return 'Order{orderNumber: $orderNumber, type: $type, status: $status}';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Order && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}
