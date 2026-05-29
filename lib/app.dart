import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/order_controller.dart';
import 'screens/home_screen.dart';

const mcRed = Color(0xFFDA291C);
const mcGold = Color(0xFFFFC72C);
const mcDark = Color(0xFF27251F);

class FeedMeApp extends StatelessWidget {
  const FeedMeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => OrderController(),
      child: MaterialApp(
        title: 'FeedMe',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: mcRed,
            brightness: Brightness.light,
          ),
          useMaterial3: true,
          scaffoldBackgroundColor: const Color(0xFFF4F4F4),
          cardTheme: CardThemeData(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          appBarTheme: const AppBarTheme(
            centerTitle: false,
            elevation: 0,
            backgroundColor: mcRed,
            foregroundColor: Colors.white,
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
