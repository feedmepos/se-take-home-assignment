/*
 * @Author: Zdd
 * @Date: 2026-05-29 15:07:23
 * @LastEditors: Zdd 445305451@qq.com
 * @LastEditTime: 2026-05-29 17:06:58
 * @FilePath: vitest.config.ts
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const resolve = {
  alias: {
    "@feedme/core": path.resolve(__dirname, "packages/core/src/index.ts"),
  },
};

export default defineConfig({
  plugins: [react()],
  resolve,
  test: {
    projects: [
      {
        resolve,
        test: {
          name: "node",
          environment: "node",
          globals: true,
          include: ["packages/**/*.test.ts"],
          exclude: ["packages/web/**/*.test.ts", "packages/web/**/*.test.tsx"],
        },
      },
      {
        resolve,
        test: {
          name: "web",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./packages/web/test/setup.ts"],
          include: ["packages/web/**/*.test.tsx", "packages/web/**/*.test.ts"],
        },
      },
    ],
  },
});
