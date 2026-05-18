/// Represents the current status of a cooking bot
enum BotStatus {
  idle,
  processing,
}

/// Domain model representing a McDonald's cooking bot
class Bot {
  final String id;
  final int botNumber;
  final BotStatus status;
  final String? currentOrderId;
  final DateTime createdAt;

  Bot({
    required this.id,
    required this.botNumber,
    this.status = BotStatus.idle,
    this.currentOrderId,
    required this.createdAt,
  });

  /// Creates a copy of the bot with updated fields
  Bot copyWith({
    String? id,
    int? botNumber,
    BotStatus? status,
    String? currentOrderId,
    DateTime? createdAt,
  }) {
    return Bot(
      id: id ?? this.id,
      botNumber: botNumber ?? this.botNumber,
      status: status ?? this.status,
      currentOrderId: currentOrderId,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// Checks if the bot is currently processing an order
  bool get isProcessing => status == BotStatus.processing;

  /// Checks if the bot is idle
  bool get isIdle => status == BotStatus.idle;

  @override
  String toString() {
    return 'Bot{botNumber: $botNumber, status: $status, currentOrderId: $currentOrderId}';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Bot && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

