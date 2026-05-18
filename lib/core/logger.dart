/// Lightweight telemetry abstraction.
///
/// In production you would swap this for Firebase Analytics, Sentry, Datadog,
/// etc.  The contract is intentionally minimal so that the domain layer
/// never imports a concrete vendor SDK.
abstract class AppLogger {
  void info(String tag, String message);
  void warn(String tag, String message);
  void error(String tag, String message, [Object? error, StackTrace? stack]);
}

/// Default implementation that writes to the debug console.
/// Replace with a real reporter for staging/production builds.
class ConsoleLogger implements AppLogger {
  const ConsoleLogger();

  @override
  void info(String tag, String message) {
    // Uses print intentionally — in production, replace with a structured
    // logging backend (e.g. `package:logging`, Sentry, Crashlytics).
    // ignore: avoid_print
    print('[INFO]  $tag: $message');
  }

  @override
  void warn(String tag, String message) {
    // ignore: avoid_print
    print('[WARN]  $tag: $message');
  }

  @override
  void error(String tag, String message,
      [Object? error, StackTrace? stack]) {
    // ignore: avoid_print
    print('[ERROR] $tag: $message${error != null ? ' | $error' : ''}');
    if (stack != null) {
      // ignore: avoid_print
      print(stack);
    }
  }
}

