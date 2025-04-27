"use client";

import { ManagerPanel } from "@/components/manager-panel";
import { OrderScreen } from "@/components/order-screen";

export default function Home() {
  return (
    <div className="container mx-auto min-h-screen p-4">
      <header className="bg-[#FFC72C] p-4 shadow-md rounded-lg mb-6">
        <h1 className="text-2xl font-bold text-[#DA291C] text-center">
          Welcome to McDonald 🍟
        </h1>
      </header>
      <div className="space-y-8">
        <OrderScreen />
        <hr className="my-8 border-dashed border-neutral-200" />
        <ManagerPanel />
      </div>
    </div>
  );
}
