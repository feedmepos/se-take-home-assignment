# 麦当劳自动化烹饪机器人订单控制系统 – 时序图

本时序图文档基于当前仓库中的 `OrderSystem.js` 实现，展示系统在关键业务场景下的交互流程，包括：

- 普通订单处理流程
- VIP 抢占 NORMAL 流程
- 删除机器人导致订单回滚流程
- 订单完成流程
- CLI 退出并生成 result.txt

所有流程均与代码行为完全一致。



## 1. 普通订单处理流程（NORMAL）

```mermaid
sequenceDiagram
    participant User as 用户
    participant System as OrderSystem
    participant Robot as 机器人

    User->>System: addOrder("NORMAL")
    System->>System: 创建订单(normalSeq++)
    System->>System: 插入 pending 并排序
    System->>System: dispatch()

    alt 有空闲机器人
        System->>Robot: 分配 NORMAL 订单
        Robot->>Robot: 开始10秒处理
        Robot-->>System: 10秒后完成
        System->>System: 订单加入 completed[]
        System->>System: dispatch()
    else 无空闲机器人
        System->>System: 等待机器人空闲
    end
```



## 2. VIP 抢占 NORMAL 流程（Preemption）

```mermaid
sequenceDiagram
    participant User as 用户
    participant System as OrderSystem
    participant Robot as 正在处理NORMAL的机器人

    User->>System: addOrder("VIP")
    System->>System: 创建订单(vipSeq++)
    System->>System: 查找是否有机器人在处理 NORMAL

    alt 存在正在处理 NORMAL 的机器人
        System->>Robot: clearTimeout() 中断 NORMAL
        Robot-->>System: 返回 NORMAL 订单
        System->>System: NORMAL 回滚到 pending
        System->>System: pending 排序
        System->>Robot: 分配 VIP 订单
        Robot->>Robot: 开始10秒处理 VIP
    else 没有 NORMAL 正在处理
        System->>System: 将 VIP 插入 pending
        System->>System: dispatch()
    end
```



## 3. 删除机器人导致订单回滚流程（removeRobot）

```mermaid
sequenceDiagram
    participant User as 用户
    participant System as OrderSystem
    participant Robot as 被删除的机器人

    User->>System: removeRobot()
    System->>System: robots.pop()

    alt 机器人是 WORKING
        System->>Robot: clearTimeout() 中断订单
        Robot-->>System: 返回正在处理的订单
        System->>System: 订单状态改为 PENDING
        System->>System: 插回 pending
        System->>System: pending 排序
        System->>System: dispatch()
    else 机器人是 IDLE
        System->>System: 直接删除
    end
```



## 4. 订单完成流程（10秒计时器）

```mermaid
sequenceDiagram
    participant System as OrderSystem
    participant Robot as 机器人
    participant Timer as 10秒计时器

    System->>Robot: 分配订单
    Robot->>Timer: setTimeout(10秒)
    Timer-->>Robot: 触发完成回调
    Robot->>System: 通知订单完成

    System->>System: 订单状态改为 DONE
    System->>System: 记录 completedAt & completedAtMs
    System->>System: 加入 completed[]
    System->>Robot: 状态改为 IDLE
    System->>System: dispatch()
```



## 5. CLI 退出并生成 result.txt

```mermaid
sequenceDiagram
    participant User as 用户
    participant CLI as CLI
    participant System as OrderSystem
    participant File as result.txt

    User->>CLI: exit
    CLI->>System: writeResult()
    System->>System: 按 completedAtMs 排序 completed[]
    System->>File: 写入 "Order <id> completed at <HH:MM:SS>"
    File-->>CLI: 写入完成
    CLI-->>User: 程序退出
```



## 文档与代码一致性声明

本时序图文档完全基于当前仓库中的 `OrderSystem.js`，所有流程均与实际行为一致。