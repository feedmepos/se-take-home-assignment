import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Order } from "../types";

function formatRelative(now: number, date: Date): string {
  const seconds = Math.floor((now - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s ago`;
}

function formatAbsolute(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface OrderAreaProps {
  title: string;
  orders: Order[];
  testId: string;
  orderTestIdPrefix: string;
  emptyMessage: string;
  accentClass: string;
  headerClass: string;
}

export function OrderArea({
  title,
  orders,
  testId,
  orderTestIdPrefix,
  emptyMessage,
  accentClass,
  headerClass,
}: OrderAreaProps) {
  const [now, setNow] = useState(Date.now());

  const hasPendingOrders = orders.some((o) => !o.completedAt);

  useEffect(() => {
    if (!hasPendingOrders) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasPendingOrders]);

  return (
    <div className={cn("rounded-lg border p-4 min-h-0 flex flex-col", accentClass)}>
      <h2 className={cn("mb-3 text-sm font-semibold uppercase tracking-wide shrink-0", headerClass)}>
        {title}{" "}
        <span className="inline-flex items-center justify-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium tabular-nums">
          {orders.length}
        </span>
      </h2>
      <div className="space-y-2 overflow-y-auto min-h-0 flex-1" data-testid={testId}>
        {orders.length === 0 && (
          <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
        )}
        {orders.map((order) => (
          <Card
            key={order.id}
            size="sm"
            className={cn(
              "bg-white border-l-3",
              order.type === "VIP" ? "border-l-amber-500" : "border-l-gray-300"
            )}
            data-testid={`${orderTestIdPrefix}-${order.id}`}
          >
            <CardContent className="flex items-center justify-between py-0">
              <div className="flex flex-col">
                <span className="font-medium">Order #{order.id}</span>
                {order.completedAt ? (
                  <span
                    className="text-xs text-muted-foreground"
                    title={`${formatAbsolute(order.createdAt)} → ${formatAbsolute(order.completedAt)}`}
                  >
                    Completed in {Math.round((order.completedAt.getTime() - order.createdAt.getTime()) / 1000)}s
                  </span>
                ) : (
                  <span
                    className="text-xs text-muted-foreground"
                    title={formatAbsolute(order.createdAt)}
                  >
                    {formatRelative(now, order.createdAt)}
                  </span>
                )}
              </div>
              <Badge
                variant={order.type === "VIP" ? "default" : "outline"}
                className={order.type === "VIP" ? "bg-amber-500 text-white" : ""}
              >
                {order.type}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
