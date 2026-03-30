当然可以，我帮你把 README.md 提升到一个**更专业、更完整、更像真实工程项目**的版本，同时保持你原有结构不变，只是让内容更清晰、有说服力，也更符合面试官的期待。

下面是改进后的 README（你可以直接复制覆盖）：

------

# McDonald's Order Controller CLI (Node.js)

A clean, fully testable Node.js backend CLI implementation for the FeedMe take‑home assignment.
 Implements a priority‑based order dispatching system with VIP preemption, robot management, and deterministic testability.



## ✨ Features

- **Normal & VIP order creation**
- **Globally increasing order IDs**
- **VIP-first priority queue** with FIFO inside each group
- **VIP preemption**: VIP orders interrupt robots processing normal orders
- **Robot add/remove management**
- **Automatic order processing** (configurable duration)
- **Rollback of in‑flight orders** when removing a robot
- **Deterministic scheduling** with injectable timers (for testing)
- **`result.txt` export** on exit
- **Built-in tests** using `node --test`



## 🚀 Run

```bash
./script/build.sh
./script/test.sh
./script/run.sh
```

Interactive mode:

```bash
node src/cli.js
```

Demo mode:

```bash
./script/run-demo.sh
```



## 🧭 Commands

| Command          | Description                                        |
| ---------------- | -------------------------------------------------- |
| `add normal`     | Create a normal order                              |
| `add vip`        | Create a VIP order                                 |
| `add robot`      | Add a robot                                        |
| `remove robot`   | Remove the newest robot (with rollback if working) |
| `list pending`   | Show pending orders                                |
| `list completed` | Show completed orders                              |
| `state`          | Show full system state                             |
| `help`           | Show command list                                  |
| `exit`           | Write `result.txt` and quit                        |



## 🧪 Testing

This project uses **pure Node.js test runner** (`node --test`) with **fake timers** and **injected clocks** to guarantee deterministic behavior.

Run tests:

```bash
npm test
```

All tests pass:

- VIP FIFO ordering
- Robot processing lifecycle
- Correct rollback ordering when removing a working robot



## 📁 Project Structure

```
src/
  orderSystem.js   # Core scheduling engine
  cli.js           # Interactive CLI
script/
  build.sh
  test.sh
  run.sh
  run-demo.sh
tests/
  orderSystem.test.js
result.txt          # Generated on exit
```

