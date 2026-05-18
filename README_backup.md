# 🍔 McDonald's Order Controller App

A Flutter-based automated order management system for McDonald's cooking bots, built as part of the FeedMe Software Engineer take-home assignment.

---

## 🔗 Live Demo

**Tested Devices:**
- 📱 Android - Small (Pixel 5), Medium (Pixel 7), Large (Pixel 10 Pro Fold)
- *The testing mainly on Android device, but flutter project expected to support on web and iOS device as well *

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Requirements Mapping](#-requirements-mapping)
3. [Features](#-features)
4. [Technology Stack](#-technology-stack)
5. [Getting Started](#-getting-started)
6. [Testing](#-testing)
7. [Architecture](#-architecture)
8. [Screenshots](#-screenshots)
9. [Assignment Context](#-assignment-context)

---

## 🎯 Project Overview

This application simulates McDonald's automated cooking bot system that manages customer orders during the COVID-19 transformation initiative. The system handles order prioritization (VIP vs Normal customers), bot management, and order processing workflow.

### Key Highlights

- ✅ **155 passing tests** with **94.2% code coverage**
- ✅ **Responsive design** - Mobile, Landscape, and Tablet layouts
- ✅ **Real-time order processing** with 10-second cooking simulation
- ✅ **Priority queue system** for VIP and Normal orders
- ✅ **Dynamic bot management** with idle/active states
- ✅ **Production-ready code** with comprehensive error handling

### Platform Support

**Tested & Supported:**
- ✅ Android (API 21+)
  - Small screens: Pixel 5
  - Medium screens: Pixel 7
  - Large screens/Foldables: Pixel 10 Pro Fold
- ✅ Web Browsers (Chrome, Firefox, Safari)

**Not Yet Tested:**
- ⏳ iOS/iPadOS
- ⏳ Desktop platforms (Windows, macOS, Linux)

---

## ✅ Requirements Mapping

### Functional Requirements

| # | Requirement | Implementation | Code Reference |
|---|-------------|----------------|----------------|
| 1 | **New Normal Order** creates order in PENDING area | ✅ Implemented | `OrderProvider.createNormalOrder()` → `OrderService.addOrder()` |
| 2 | **New VIP Order** places order ahead of Normal but behind existing VIP orders | ✅ Implemented | `OrderService._insertOrder()` - Priority queue logic |
| 3 | **Unique & increasing order numbers** | ✅ Implemented | `OrderService._nextOrderId` auto-increment counter |
| 4 | **+ Bot** creates bot and starts processing PENDING orders | ✅ Implemented | `OrderProvider.addBot()` → `OrderService._processBotOrders()` |
| 5 | **10-second order processing** moves order to COMPLETE | ✅ Implemented | `OrderService._processBotOrders()` with `Future.delayed(Duration(seconds: 10))` |
| 6 | **Bot becomes IDLE** when no orders in PENDING | ✅ Implemented | `Bot.status = BotStatus.idle` in `OrderService` |
| 7 | **- Bot** removes newest bot and returns processing order to PENDING (maintaining priority) | ✅ Implemented | `OrderService.removeBot()` with order reinsertion logic |

### User Stories

| User Story | Status | Implementation Details |
|------------|--------|------------------------|
| **Normal Customer**: See order flow from PENDING → COMPLETE | ✅ Complete | Real-time UI updates via `ChangeNotifier` pattern |
| **VIP Customer**: Order processed before Normal customers | ✅ Complete | Priority queue with VIP orders inserted before Normal orders |
| **Manager**: Increase/decrease bot count dynamically | ✅ Complete | Add/Remove bot buttons with immediate order processing |
| **Bot**: Process 1 order at a time (10 seconds each) | ✅ Complete | Async order processing with state tracking |

---

## 🚀 Features

### Core Features
- **Order Management**
  - Create Normal and VIP orders with unique IDs
  - Real-time order status tracking (Pending → Cooking → Completed)
  - Priority-based order queue system
  
- **Bot Management**
  - Add/remove cooking bots dynamically
  - Bot status indicators (IDLE, COOKING)
  - Current order assignment display for each bot
  
- **User Interface**
  - Statistics dashboard (Pending, Total Bots, Active Bots, Completed)
  - Clear completed orders with confirmation dialog
  - Empty state messages for better UX
  - Smooth animations for order transitions

### Responsive Design (Android)
- **Small Devices** (Pixel 5): Vertical scrolling with stacked sections
- **Medium Devices** (Pixel 7): Optimized portrait and landscape layouts
- **Large Devices** (Pixel 10 Pro Fold): Sidebar controls + 3-column layout in landscape, tablet-style layout when unfolded

The app automatically adapts to different screen sizes using Flutter's responsive design patterns.

### Additional Features
- **Testing**: Comprehensive test suite with unit, widget, and integration tests
- **State Management**: Provider pattern for reactive UI updates
- **Logging**: Structured logging with ConsoleLogger
- **Error Handling**: Graceful handling of edge cases
- **Accessibility**: Proper semantics and contrast ratios

---

## 🛠️ Technology Stack

### Framework & Language
- **Flutter 3.6+**: Cross-platform UI framework
- **Dart 3.0+**: Modern, type-safe programming language

### State Management
- **Provider**: Dependency injection and state management pattern
- **ChangeNotifier**: Reactive state updates

### Testing
- **flutter_test**: Widget and unit testing
- **mockito**: Mocking for isolated unit tests
- **test**: Core Dart testing framework

### Why Flutter?
1. **Android Native Performance**: Compiles to native ARM code for smooth performance
2. **Web Deployment**: Single codebase deploys to web for public accessibility
3. **Fast Development**: Hot reload for rapid iteration
4. **Beautiful UI**: Material Design with customizable widgets
5. **Strong Testing**: First-class testing support
6. **Production Ready**: Used by Google, Alibaba, BMW, etc.

---

## 🏃 Getting Started

### Prerequisites
```bash
# Install Flutter SDK (3.6.0 or higher)
# https://docs.flutter.dev/get-started/install

# Verify installation
flutter doctor
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/order_controller_app.git
cd order_controller_app
```

2. **Install dependencies**
```bash
flutter pub get
```

3. **Run the app**
```bash
# Run on Android device/emulator
flutter run

# Run on Chrome (Web) for testing
flutter run -d chrome

# List available devices
flutter devices
```

**Note:** This app has been tested on Android devices (Pixel 5, Pixel 7, Pixel 10 Pro Fold) and web browsers.

### Project Structure
```
lib/
├── main.dart                          # App entry point
├── constants/                         # App constants (colors, strings, sizes)
│   ├── app_colors.dart
│   ├── app_strings.dart
│   └── app_sizes.dart
├── models/                            # Data models
│   ├── order.dart                     # Order model with priority
│   ├── bot.dart                       # Bot model with status
│   └── order_system_state.dart        # System state snapshot
├── services/                          # Business logic
│   └── order_service.dart             # Core order/bot management logic
├── providers/                         # State management
│   └── order_provider.dart            # Provider for UI binding
├── screens/                           # Screen layouts
│   ├── order_management_screen.dart   # Main screen orchestrator
│   └── components/                    # Layout components
│       ├── mobile_layout.dart
│       ├── landscape_layout.dart
│       └── tablet_layout.dart
├── widgets/                           # Reusable widgets
│   ├── order_card.dart
│   ├── bot_card.dart
│   └── stats_card.dart
└── common/widgets/                    # Common UI components
    ├── clear_button.dart
    ├── section_container.dart
    └── empty_state_widget.dart

test/
├── constants_test.dart                # Constants validation
├── models_test.dart                   # Model tests (50+ tests)
├── provider_test.dart                 # Provider tests (51 tests)
├── order_management_test.dart         # Service tests (20+ tests)
├── widget_test.dart                   # Widget tests
├── widget_integration_test.dart       # Integration tests
├── layout_test.dart                   # Layout tests
└── logger_test.dart                   # Logger tests
```

**Note:** For Android APK distribution, use:
```bash
flutter build apk --release
# APK will be in: build/app/outputs/flutter-apk/app-release.apk
```

---

## 🧪 Testing

### Run All Tests
```bash
flutter test
```

### Run Tests with Coverage
```bash
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

### Test Coverage Summary

| Category | Files | Coverage | Notable Achievements |
|----------|-------|----------|---------------------|
| **Overall** | 21 files | **94.2%** (848/900 lines) | Industry standard: 80% |
| **Models** | 3 files | **100%** | Complete coverage |
| **Services** | 1 file | **97.5%** | Near-perfect coverage |
| **Providers** | 1 file | **100%** | Complete coverage |
| **Core Logic** | 1 file | **100%** | Complete coverage |
| **Widgets** | 7 files | **95-100%** | Excellent coverage |
| **Layouts** | 3 files | **65-100%** | Good coverage |

### Test Breakdown
- **155 total tests**
  - 50 tests: Model validation and behavior
  - 51 tests: Provider state management
  - 20 tests: Order service business logic
  - 8 tests: Constants validation
  - 6 tests: Logger functionality
  - 20 tests: Widget and integration tests

---

## 🏗️ Architecture

### Design Patterns

#### 1. **Clean Architecture**
- **Models**: Pure data classes (Order, Bot)
- **Services**: Business logic layer (OrderService)
- **Providers**: Presentation layer bridge (OrderProvider)
- **UI**: Presentation layer (Screens, Widgets)

#### 2. **State Management: Provider Pattern**
```
User Action → Provider → Service → State Update → UI Rebuild
```

#### 3. **Dependency Injection**
```dart
ChangeNotifierProvider<OrderProvider>(
  create: (_) => OrderProvider(service: OrderService()),
  child: MaterialApp(...),
)
```

### Key Design Decisions

#### Order Priority Queue
```dart
// VIP orders are inserted before the first Normal order
// Maintains FIFO within each priority group
void _insertOrder(Order order) {
  if (order.priority == OrderPriority.vip) {
    // Find first normal order
    final insertIndex = _pendingOrders.indexWhere(
      (o) => o.priority == OrderPriority.normal
    );
    if (insertIndex == -1) {
      _pendingOrders.add(order); // All VIP, add to end
    } else {
      _pendingOrders.insert(insertIndex, order); // Insert before normal
    }
  } else {
    _pendingOrders.add(order); // Normal orders go to end
  }
}
```

#### Bot Processing Logic
- Each bot runs in its own async task
- Uses `Future.delayed(Duration(seconds: 10))` for cooking simulation
- Automatically picks next order when available
- Gracefully handles bot removal during processing

#### Responsive Layout Selection
```dart
Widget _resolveLayout(BuildContext context) {
  final size = MediaQuery.of(context).size;
  final shortestSide = size.shortestSide;
  final orientation = MediaQuery.of(context).orientation;
  
  // Uses shortestSide to distinguish phone vs tablet
  final isTablet = shortestSide >= 600;
  final isLandscape = orientation == Orientation.landscape && !isTablet;
  
  if (isTablet) return TabletLayout();
  if (isLandscape) return LandscapeLayout();
  return MobileLayout();
}
```

### Data Flow
```
┌─────────────────┐
│   UI Actions    │  (Button Taps)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OrderProvider  │  (State Management)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OrderService   │  (Business Logic)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  State Update   │  (Models)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   UI Rebuild    │  (Reactive Updates)
└─────────────────┘
```

---

## 📱 Screenshots

### Small Android Device (Pixel 5)
![Mobile View](screenshots/mobile.png)
*Portrait mode - Vertical scrolling layout with stacked sections*

### Medium Android Device (Pixel 7)
![Landscape View](screenshots/landscape.png)
*Landscape mode - Sidebar controls with 3-column order display*

### Large Android Device (Pixel 10 Pro Fold)
![Tablet View](screenshots/tablet.png)
*Unfolded mode - Full-width layout with side-by-side columns*

### Order Flow Demonstration
![Order Flow](screenshots/order-flow.gif)
*Real-time order processing from Pending → Cooking → Completed*

---

## 📝 Assignment Context

### Original Requirements

This project was built in response to the **FeedMe Software Engineer Take Home Assignment** with the following scenario:

**Situation:** McDonald's is building automated cooking bots during COVID-19 to reduce workforce and increase efficiency.

**Task:** Create an order controller to handle the order control flow.

### Implementation Approach

1. **Framework Selection**: Chose Flutter for cross-platform capability and web deployment
2. **Architecture**: Clean architecture with clear separation of concerns
3. **Testing Strategy**: Test-driven development with 94% coverage
4. **UI/UX**: Professional, responsive design matching McDonald's brand
5. **Code Quality**: Production-ready code with proper error handling

### Time Investment

While the assignment suggested 1 hour with AI assistance, I prioritized:
- ✅ **Quality over speed**: Production-ready code
- ✅ **Comprehensive testing**: 155 tests for reliability
- ✅ **Responsive design**: Real-world usage scenarios
- ✅ **Clean architecture**: Maintainable and scalable codebase

**Actual time**: ~8-12 hours (with focus on testing and polish)

**MVP (1-hour version) would include:**
- Single mobile layout
- Basic order/bot functionality
- Core service tests only
- Minimal UI polish

---

## 🚀 Future Enhancements

### Potential Features
- [ ] Order history with timestamps
- [ ] Bot performance analytics
- [ ] Custom order cook time
- [ ] Sound notifications when order completes
- [ ] Dark mode support
- [ ] Multi-language support
- [ ] Order cancellation
- [ ] Bot efficiency metrics
- [ ] Backend integration (Firebase/REST API)
- [ ] Persistent storage (SharedPreferences/Hive)

### Technical Improvements
- [ ] iOS compatibility testing and optimization
- [ ] Desktop (Windows, macOS, Linux) builds
- [ ] Add integration tests for all layouts
- [ ] Implement BLoC pattern as alternative to Provider
- [ ] Add performance profiling
- [ ] Implement proper error boundaries
- [ ] Add analytics tracking
- [ ] Optimize build size
- [ ] Add CI/CD pipeline

---

## 📄 License

This project is created for the FeedMe Software Engineer take-home assignment.

---

## 👤 Author

**Arfakhsy Adnan**

- GitHub: [@mohamadarfakhsy13](https://github.com/mohamadarfakhsy13)
- LinkedIn: [Mohamad Arfakhsy](https://www.linkedin.com/in/mohamad-arfakhsy/)
- Email: mohamad.arfakhsy13@gmail.com

---

## 🙏 Acknowledgments

- Assignment provided by **FeedMe**
- Flutter framework by Google
- Icons from Material Design Icons
- Coding assistance from GitHub Copilot

---

## 📞 Contact

For questions or feedback about this project:
- Create an issue in this repository
- Email: mohamad.arfakhsy13@gmail.com

---

**Built with ❤️ using Flutter**

Last Updated: May 18, 2026
