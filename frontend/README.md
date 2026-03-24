# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Testing Conditions and User Story

The following test conditions have been mapped from the provided User Stories to validate the McDonald's Bot Orchestrator:

### 1. New Normal Order
- **Scenario:** A new Normal order is placed.
- **Expected Result:** The order instantly enters the "PENDING" area. Order number is unique and strictly increasing.

### 2. New VIP Order
- **Scenario:** A new VIP order is placed.
- **Expected Result:** The order instantly enters the "PENDING" area. It automatically queues in front of all existing "Normal" orders, but strictly remains queued behind any existing older "VIP" orders.

### 3. Adding a Cooking Bot (+ Bot)
- **Scenario:** A manager clicks "+ Bot", deploying a new bot.
- **Expected Result:** The bot is created and automatically picks up the highest priority order from the "PENDING" area. Note: Once picked up, it takes precisely 10 seconds for the processing to finish before the order gets pushed out to the "COMPLETE" area. A bot can only handle 1 order at a time. After successfully completing an order, if the pending area is empty, it becomes IDLE; otherwise, it grabs the next priority pending order.

### 4. Removing a Cooking Bot (- Bot)
- **Scenario:** A manager clicks "- Bot" to remove a cooking bot.
- **Expected Result:** The newest bot (the one added most recently) is immediately removed and destroyed. If it was an active bot in the middle of processing an order, processing is forcefully halted. The half-processed order is correctly inserted back into the "PENDING" area maintaining the VIP/Normal priority rules without losing position.
