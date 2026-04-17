# Project Constraints

This repository will follow these implementation constraints unless explicitly changed later.

## Fixed Decisions

- Solution type: backend
- Language: Go
- Source code location: `src`
- Tests: keep `_test.go` files alongside the implementation files, do not create a separate `tests` directory
- Separate business logic from input handling
- Support both scripted execution and interactive CLI input

## Agreed Directory Structure

```text
.
├── README.md
├── AGENTS.md
├── .gitignore
├── go.mod
├── go.sum
├── scripts
│   ├── build.sh
│   ├── input.txt
│   ├── run.sh
│   ├── test
│   │   ├── input_complex_edge_cases.txt
│   │   ├── input_complex_multi_bot.txt
│   │   ├── input_complex_remove_busy_bot.txt
│   │   ├── input_complex_remove_idle_bot.txt
│   │   ├── input_complex_staggered_arrivals.txt
│   │   ├── result_input_complex_edge_cases.txt
│   │   ├── result_input_complex_multi_bot.txt
│   │   ├── result_input_complex_remove_busy_bot.txt
│   │   ├── result_input_complex_remove_idle_bot.txt
│   │   ├── result_input_complex_staggered_arrivals.txt
│   │   └── run_all_inputs.sh
│   ├── test.sh
│   └── result.txt
└── src
    ├── cmd
    │   └── orderctl
    │       └── main.go
    └── internal
        ├── app
        │   ├── command.go
        │   ├── command_executor.go
        │   ├── command_parser.go
        │   ├── runner.go
        │   └── runner_test.go
        ├── clock
        │   ├── clock.go
        │   └── fake_clock.go
        ├── core
        │   ├── controller.go
        │   ├── controller_test.go
        │   ├── event_list.go
        │   ├── model
        │   │   ├── bot.go
        │   │   ├── constants.go
        │   │   ├── flow_manager.go
        │   │   ├── flow_manager_test.go
        │   │   ├── id_format.go
        │   │   ├── order.go
        │   │   ├── processing_record.go
        │   │   ├── store.go
        │   │   └── store_test.go
        │   ├── processing_record_heap.go
        │   ├── processing_record_heap_test.go
        │   ├── scheduler.go
        │   └── scheduler_test.go
        ├── output
        │   └── writer.go
        └── protocol
            └── commands.go
```

## Notes

- Any later design discussion should default to this structure.
- If the structure changes, update this file first so the repository remains the source of truth.

## Agreed Design Constraints

- `Controller` is the orchestration layer and should not directly own queue details.
- `Store` manages all orders and bots as in-memory collections.
- `FlowManager` manages order flow states such as `pendingVIP`, `pendingNormal`, and `complete`.
- `Scheduler` manages bot-to-order assignments and processing progress.
- `Bot` only contains `ID`, `Status`, and `ProcessDuration`.
- Bot-to-order assignment state does not live on `Bot`; it belongs to `Scheduler`.
- `Store` uses slices as the primary storage shape for both orders and bots.
- Use slice-based storage first; if later lookups by ID become costly, add index maps as secondary structures.
- `Scheduler` should add a bot assignment index map for efficient lookup when removing a bot.
- The current preferred scheduler shape is a primary assignment collection plus secondary lookup indexes when needed.
- Current input format is line-based CLI commands rather than JSON.

## Current Input Direction

- `$order normal`
- `$order vip`
- `$bot add`
- `$bot remove`
- `$tick <duration>`
- `$status`
- `$help`
- `$exit`
