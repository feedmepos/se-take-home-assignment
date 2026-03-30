# 麦当劳自动化烹饪机器人订单控制系统 – 测试说明文档

本测试文档基于当前仓库中的 `OrderSystem.js` 实现，描述系统的测试范围、测试策略、关键测试用例、边界情况以及如何运行测试。



## 1. 测试目标

确保系统在以下方面行为正确：

- 订单创建（VIP / NORMAL）
- 队列排序（VIP 优先 + FIFO）
- VIP 抢占 NORMAL
- 机器人调度
- 订单处理（10 秒）
- 删除机器人与订单回滚
- 订单完成记录（时间戳）
- result.txt 输出格式与排序
- CLI 与脚本可在 GitHub Actions 中稳定运行



## 2. 测试范围

系统测试分为三类：

### 2.1 单元测试（核心逻辑）

覆盖 OrderSystem 的核心方法：

| 模块        | 方法               | 测试内容                       |
| ----------- | ------------------ | ------------------------------ |
| OrderSystem | `addOrder`         | VIP / NORMAL 插入、抢占、排序  |
| OrderSystem | `addRobot`         | 新机器人立即调度               |
| OrderSystem | `removeRobot`      | LIFO 删除、回滚逻辑            |
| OrderSystem | `#dispatch`        | 空闲机器人自动接单             |
| OrderSystem | `#startProcessing` | 订单状态变化、计时器设置       |
| OrderSystem | `#completeOrder`   | 完成时间记录、completed[] 排序 |
| OrderSystem | `writeResult`      | result.txt 输出格式            |



### 2.2 集成测试（流程级）

验证完整业务流程：

- 创建多个订单（混合 VIP / NORMAL）
- 增加多个机器人
- 触发抢占
- 删除机器人触发回滚
- 等待所有订单完成
- 检查 `completed[]` 顺序
- 检查 `result.txt` 内容



### 2.3 GitHub Actions 测试（自动化）

确保：

- `script/build.sh` 正常执行
- `script/test.sh` 正常执行
- `script/run-demo.sh` 能生成 `result.txt`
- CI 全绿



## 3. 测试策略

### 3.1 单元测试策略

- 使用 Node.js 内置 `node:test` 或 Jest（取决于仓库配置）
- 每个测试用例独立创建新的 `OrderSystem` 实例
- 使用 fake timers（如 `jest.useFakeTimers`）模拟 10 秒处理时间，避免真实等待
- 对 `pending[]`、`completed[]`、`robots[]` 进行断言



### 3.2 集成测试策略

- 使用真实计时器（或加速计时器）
- 运行完整流程
- 最终断言：
  - 所有订单状态为 `DONE`
  - `completed[]` 按完成时间排序
  - `result.txt` 内容正确



### 3.3 边界情况测试策略

必须覆盖以下边界情况：

| 场景                             | 说明              |
| -------------------------------- | ----------------- |
| 无机器人时创建订单               | pending 不应丢失  |
| 多个 VIP 连续抢占                | NORMAL 应多次回滚 |
| 删除机器人时 pending 为空        | 不应报错          |
| 删除机器人时多个机器人工作       | 仅删除最后一个    |
| 订单完成瞬间删除机器人           | 不应重复回滚      |
| 机器人数量为 0 时 `removeRobot`  | 安全忽略          |
| pending 中只有 NORMAL 时添加 VIP | 必须抢占          |



## 4. 关键测试用例（建议实现）

以下是建议在 `tests/` 中实现的关键测试用例。



### 4.1 订单创建与排序

**用例**：VIP 插入顺序正确

```
addOrder(NORMAL)
addOrder(NORMAL)
addOrder(VIP)
addOrder(VIP)
```

**期望**：

```
pending = [VIP1, VIP2, NORMAL1, NORMAL2]
```



### 4.2 VIP 抢占 NORMAL

**用例**：VIP 抢占正在处理的 NORMAL

```
addRobot()
addOrder(NORMAL)
addOrder(VIP)
```

**期望**：

- NORMAL 被中断并回滚到 pending
- VIP 立即占用机器人
- pending = [NORMAL]



### 4.3 删除机器人 → 回滚订单

**用例**：删除工作中的机器人导致订单回滚

```
addRobot()
addOrder(NORMAL)
removeRobot()
```

**期望**：

- NORMAL 回滚到 pending
- `pending.length === 1`
- 机器人被删除



### 4.4 多机器人调度

**用例**：多个机器人同时处理订单

```
addRobot()
addRobot()
addOrder(NORMAL)
addOrder(NORMAL)
```

**期望**：

- 两个机器人同时处理两个订单
- 10 秒后 `completed.length === 2`



### 4.5 订单完成时间记录

**用例**：订单完成时间戳正确记录

```
addRobot()
addOrder(NORMAL)
```

**期望**（10 秒后）：

- `completed[0].completedAt` 为 `HH:MM:SS` 格式
- `completed[0].completedAtMs` 为 `number`



### 4.6 result.txt 输出格式

**用例**：退出时生成正确格式的结果文件

运行：

```
./script/run-demo.sh
```

**期望**：

- 文件存在
- 每行格式为：
  ```
  Order <id> completed at <HH:MM:SS>
  ```
- 按 `completedAtMs` 排序



## 5. 如何运行测试

### 5.1 本地运行

```
./script/test.sh
```

或直接：

```
npm test
```



### 5.2 GitHub Actions 自动运行

每次 push 到 `main`：

- 自动执行 `build.sh`
- 自动执行 `test.sh`
- 自动执行 `run-demo.sh`
- 上传 `result.txt`

你可以在：

```
https://github.com/<your-repo>/actions
```

查看测试结果。



## 6. 测试覆盖率建议（可选）

可加入：

- `c8`（Node 官方覆盖率工具）
- Jest `--coverage`

建议覆盖率目标：

| 模块        | 覆盖率 |
| ----------- | ------ |
| OrderSystem | ≥ 90%  |
| Robot       | ≥ 80%  |
| CLI         | 可选   |



## 7. 测试总结

本系统的测试重点在于：

- **排序正确性**（VIP FIFO + NORMAL FIFO）
- **抢占逻辑**
- **回滚逻辑**
- **调度逻辑**
- **计时器行为**
- **result.txt 输出**

通过上述测试策略与用例，可以确保系统行为稳定、可预测、可验证，满足企业级质量要求。



**文档与代码一致性声明**  
本测试文档完全基于当前仓库中的 `OrderSystem.js`，所有测试用例与代码行为保持一致。