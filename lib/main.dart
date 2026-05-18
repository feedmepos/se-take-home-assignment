import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'constants/constants.dart';
import 'providers/order_provider.dart';
import 'screens/order_management_screen.dart';

/// Entry point for the McDonald's Order Management System
void main() {
  runApp(const McDonaldsOrderApp());
}

/// Root application widget
class McDonaldsOrderApp extends StatelessWidget {
  const McDonaldsOrderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => OrderProvider(),
      child: MaterialApp(
        title: AppStrings.appTitle,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: Colors.red,
            primary: AppColors.primaryLight,
          ),
          useMaterial3: true,
          fontFamily: 'Roboto',
        ),
        home: const OrderManagementScreen(),
      ),
    );
  }
}
