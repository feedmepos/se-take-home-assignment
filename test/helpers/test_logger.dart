import 'package:order_controller_app/core/logger.dart';

/// Silent logger for use in unit / widget tests.
/// Captures log calls so tests can assert on telemetry output
/// without polluting the test runner console.
class TestLogger implements AppLogger {
  final List<LogEntry> entries = [];

  @override
  void info(String tag, String message) =>
      entries.add(LogEntry(LogLevel.info, tag, message));

  @override
  void warn(String tag, String message) =>
      entries.add(LogEntry(LogLevel.warn, tag, message));

  @override
  void error(String tag, String message,
          [Object? error, StackTrace? stack]) =>
      entries.add(LogEntry(LogLevel.error, tag, message));

  /// Returns all messages that contain [substring].
  List<LogEntry> containing(String substring) =>
      entries.where((e) => e.message.contains(substring)).toList();
}

enum LogLevel { info, warn, error }

class LogEntry {
  final LogLevel level;
  final String tag;
  final String message;
  const LogEntry(this.level, this.tag, this.message);

  @override
  String toString() => '[${level.name.toUpperCase()}] $tag: $message';
}

