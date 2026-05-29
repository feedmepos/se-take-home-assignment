## ADDED Requirements

### Requirement: Headless Mode Output
系统 SHALL 支持无头模式，运行预定义场景并输出结果到 result.txt。

#### Scenario: 无头模式执行
- **WHEN** 用户运行无头模式
- **THEN** 系统执行预定义场景（添加机器人、创建订单等）
- **THEN** 所有输出写入 result.txt 文件

### Requirement: Timestamps in Output
系统 SHALL 在输出中包含 HH:MM:SS 格式的时间戳。

#### Scenario: 时间戳格式正确
- **WHEN** 输出日志信息
- **THEN** 每条日志包含 HH:MM:SS 格式的时间戳

### Requirement: Scripts for GitHub Actions
系统 SHALL 提供完整的脚本以通过 GitHub Actions 验证。

#### Scenario: 脚本功能正常
- **WHEN** 运行 test.sh
- **THEN** 执行单元测试

- **WHEN** 运行 build.sh
- **THEN** 编译 CLI 应用

- **WHEN** 运行 run.sh
- **THEN** 运行 CLI 并输出到 result.txt
