import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // 仅统计领域运行时逻辑;排除纯类型声明与桶导出文件。
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/protocol.ts',
        'src/events/DomainEvent.ts',
        'src/clock/Clock.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
