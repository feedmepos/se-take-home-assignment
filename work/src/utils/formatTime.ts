// 集中处理界面时间格式，保证订单卡片与事件日志的显示规则一致。
export function formatTime(value: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}
