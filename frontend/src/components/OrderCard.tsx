import { useEffect, useRef, useState } from "react";
import type { Order } from "../reducer/types";
import { CircularProgress } from "./CircularProgress";
import { ORDER_DURATION_MS, ORDER_DURATION_S } from "../constants";

function OrderTypeBadge({ type }: { type: Order["type"] }) {
  if (type === "VIP") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-mcd-gold text-mcd-black">
        VIP
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
      Normal
    </span>
  );
}

function OrderHeader({ id }: { id: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
        Order
      </span>
      <span className="text-xl font-black text-mcd-black leading-none">
        #{id}
      </span>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (order.status !== "PROCESSING" || order.startedAt === null) return;
    const startedAt = order.startedAt;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - startedAt));
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [order.status, order.startedAt]);

  const progress = Math.min(elapsed / ORDER_DURATION_MS, 1);
  const countdown = Math.max(Math.ceil(ORDER_DURATION_S - elapsed / 1000), 0);

  if (order.status === "COMPLETE") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border-l-4 border-green-500 flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <OrderHeader id={order.id} />
          <div className="mt-1">
            <OrderTypeBadge type={order.type} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-green-500 text-lg">✓</span>
          <span className="text-[11px] font-bold text-green-500">Done</span>
        </div>
      </div>
    );
  }

  if (order.status === "PROCESSING") {
    return (
      <div className="bg-white rounded-2xl shadow-md border-l-4 border-mcd-red flex items-center gap-3 px-4 py-3">
        <CircularProgress progress={progress} countdown={countdown} size={52} />
        <div className="flex-1 min-w-0">
          <OrderHeader id={order.id} />
          <div className="mt-1">
            <OrderTypeBadge type={order.type} />
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-mcd-red shrink-0">
          Cooking
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-mcd-gold flex items-center gap-3 px-4 py-3">
      <CircularProgress progress={0} countdown={ORDER_DURATION_S} size={52} />
      <div className="flex-1 min-w-0">
        <OrderHeader id={order.id} />
        <div className="mt-1">
          <OrderTypeBadge type={order.type} />
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 shrink-0">
        Queued
      </span>
    </div>
  );
}
