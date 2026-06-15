# McDonald's Order Controller

Backend CLI prototype for the McDonald's cooking bot order flow assignment, implemented with Node.js and TypeScript.

## Overview

This project simulates an in-memory order controller for a restaurant with:

- `NORMAL` and `VIP` orders
- multiple cooking bots
- VIP priority handling
- bot add/remove behavior
- 10-second order processing time
- timestamped completion tracking

There is no database or persistent storage. All state is kept in memory.

## Features

- Normal orders are appended behind existing pending orders.
- VIP orders are inserted behind existing VIP orders and ahead of all pending normal orders.
- Order IDs are unique and strictly increasing.
- Each bot processes only one order at a time.
- Each order takes 10 seconds to complete in the real runtime flow.
- Adding a bot immediately starts processing if pending orders exist.
- Removing the newest bot cancels its current job and returns that order to the correct pending position.
- Completion timestamps are recorded in `HH:MM:SS` format.

## Project Structure

- `src/core`: core order and bot business logic
- `src/cli`: interactive CLI, demo runner, and terminal view formatting
- `test`: automated tests
- `scripts`: required assignment shell scripts
- `dist`: compiled JavaScript output

## Requirements

- Node.js
- npm

## Installation

```bash
npm install
```

## Available Commands

```bash
npm run build
npm test
npm start
npm run demo
```

What each command does:

- `npm run build`: compiles TypeScript into `dist/`
- `npm test`: builds the project and runs automated tests
- `npm start`: starts the interactive CLI
- `npm run demo`: runs the non-interactive scripted scenario used by `run.sh`

## Assignment Scripts

The repository includes the required shell scripts:

- [scripts/build.sh](/Users/sun/Documents/assg/scripts/build.sh): compile the TypeScript project
- [scripts/test.sh](/Users/sun/Documents/assg/scripts/test.sh): run automated tests
- [scripts/run.sh](/Users/sun/Documents/assg/scripts/run.sh): run the scripted demo and write output to [result.txt](/Users/sun/Documents/assg/result.txt)

Run them from the project root:

```bash
./scripts/build.sh
./scripts/test.sh
./scripts/run.sh
```

## Interactive CLI

Start the interactive CLI with:

```bash
npm start
```

Available commands:

- `add normal`
- `add vip`
- `add bot`
- `remove bot`
- `status`
- `help`
- `exit`

For `add normal` and `add vip`, the CLI will ask how many orders to create.

## result.txt Output

`run.sh` generates [result.txt](/Users/sun/Documents/assg/result.txt) using a scripted scenario. The output is intentionally concise and focuses on the required flow:

- order creation
- bot assignment
- bot removal during processing
- order completion timestamps
- final system summary

Example log style:

```text
[23:55:59] Added NORMAL orders: #1, #2
[23:55:59] Added VIP order: #3
[23:55:59] Bot #1 started #3 (VIP)
[23:56:09] Order #3 (VIP) completed at 23:56:09
```

## Testing

Automated tests cover:

- normal order creation
- VIP priority ordering
- bot pickup behavior
- order completion flow
- completion event callbacks
- removing a busy bot mid-process
- removing an idle bot
- idle bot pickup after new orders arrive
- invalid order count handling

Run tests with:

```bash
./scripts/test.sh
```

## Design Notes

- Core logic is separated from CLI input/output for easier testing.
- The interactive CLI and the scripted demo use the same controller logic.
- Interactive mode is for manual demonstration.
- Demo mode is for producing a clean `result.txt` artifact for submission.
