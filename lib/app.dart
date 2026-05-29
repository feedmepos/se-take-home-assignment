import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/order_controller.dart';
import 'screens/home_screen.dart';

class FeedMeApp extends StatelessWidget {
  const FeedMeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => OrderController(),
      child: MaterialApp(
        title: 'FeedMe - Order Management System',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: Colors.red,
            brightness: Brightness.light,
          ),
          useMaterial3: true,
          appBarTheme: AppBarTheme(
            centerTitle: true,
            elevation: 0,
            backgroundColor: Colors.red.shade700,
            foregroundColor: Colors.white,
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
