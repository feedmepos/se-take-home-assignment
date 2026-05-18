import 'package:flutter_test/flutter_test.dart';
import 'package:order_controller_app/core/logger.dart';

import 'helpers/test_logger.dart';

/// Tests for the logger abstraction layer.
void main() {
  group('ConsoleLogger', () {
    // ConsoleLogger writes to stdout. We just verify it doesn't throw.
    const logger = ConsoleLogger();

    test('info does not throw', () {
      expect(() => logger.info('Test', 'info message'), returnsNormally);
    });

    test('warn does not throw', () {
      expect(() => logger.warn('Test', 'warn message'), returnsNormally);
    });

    test('error without optional params does not throw', () {
      expect(() => logger.error('Test', 'error message'), returnsNormally);
    });

    test('error with error object does not throw', () {
      expect(
        () => logger.error('Test', 'error message', Exception('oops')),
        returnsNormally,
      );
    });

    test('error with error and stack does not throw', () {
      expect(
        () => logger.error(
          'Test',
          'error message',
          Exception('oops'),
          StackTrace.current,
        ),
        returnsNormally,
      );
    });
  });

  group('TestLogger', () {
    late TestLogger logger;

    setUp(() { logger = TestLogger(); });

    test('captures info entries', () {
      logger.info('Tag', 'hello world');
      expect(logger.entries.length, 1);
      expect(logger.entries.first.level, LogLevel.info);
      expect(logger.entries.first.tag, 'Tag');
      expect(logger.entries.first.message, 'hello world');
    });

    test('captures warn entries', () {
      logger.warn('Tag', 'be careful');
      expect(logger.entries.length, 1);
      expect(logger.entries.first.level, LogLevel.warn);
    });

    test('captures error entries', () {
      logger.error('Tag', 'kaboom', Exception('err'), StackTrace.current);
      expect(logger.entries.length, 1);
      expect(logger.entries.first.level, LogLevel.error);
    });

    test('containing filters correctly', () {
      logger.info('A', 'hello world');
      logger.info('B', 'goodbye world');
      logger.info('C', 'hello again');

      final matches = logger.containing('hello');
      expect(matches.length, 2);
    });

    test('containing returns empty when no match', () {
      logger.info('A', 'nothing relevant');
      expect(logger.containing('xyz'), isEmpty);
    });

    test('LogEntry toString formats correctly', () {
      const entry = LogEntry(LogLevel.info, 'MyTag', 'my message');
      expect(entry.toString(), '[INFO] MyTag: my message');
    });

    test('LogEntry toString for warn', () {
      const entry = LogEntry(LogLevel.warn, 'T', 'm');
      expect(entry.toString(), '[WARN] T: m');
    });

    test('LogEntry toString for error', () {
      const entry = LogEntry(LogLevel.error, 'T', 'm');
      expect(entry.toString(), '[ERROR] T: m');
    });
  });
}

