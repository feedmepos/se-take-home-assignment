"use client";

import { useState } from "react";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { apiService } from "@/services/api";
import { 
  Bot, 
  Zap, 
  CheckCircle2, 
  Clock, 
  ChefHat
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { OrderForm } from "@/components/OrderForm";
import { WorkforceManager } from "@/components/WorkforceManager";
import { ActionLog } from "@/components/ActionLog";

export default function Home() {
  const { status, loading, error } = useRealtimeStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateOrder = async (name: string, type: "normal" | "vip") => {
    setIsSubmitting(true);
    try {
      await apiService.createOrder(name, type);
    } catch (err) {
      console.error("Order creation failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScaleBots = async (delta: number) => {
    if (!status) return;
    const newCount = Math.max(0, Math.min(100, status.active_bots + delta));
    try {
      await apiService.scaleBots(newCount);
    } catch (err) {
      console.error("Scaling bots failed:", err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-mcdonalds-red p-3 rounded-xl shadow-lg shadow-mcdonalds-red/20">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">McDonald's Order Controller</h1>
              <p className="text-slate-500 font-medium">Automated Kitchen System v1.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 border ${loading ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-slate-300' : 'bg-emerald-500 animate-pulse'}`} />
              {loading ? 'Connecting...' : 'Live System'}
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<Bot className="w-6 h-6 text-blue-500" />}
            label="Active Bots"
            value={status?.active_bots ?? 0}
            color="blue"
          />
          <StatCard 
            icon={<Clock className="w-6 h-6 text-amber-500" />}
            label="Pending Orders"
            value={status?.in_queue ?? 0}
            color="amber"
          />
          <StatCard 
            icon={<Zap className="w-6 h-6 text-indigo-500" />}
            label="In Process"
            value={status?.in_process ?? 0}
            color="indigo"
          />
          <StatCard 
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
            label="Completed"
            value={status?.completed ?? 0}
            color="emerald"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <OrderForm 
              onCreateOrder={handleCreateOrder} 
              isSubmitting={isSubmitting} 
            />
            <WorkforceManager 
              activeBots={status?.active_bots ?? 0} 
              onScale={handleScaleBots} 
            />
          </div>

          <div className="lg:col-span-1">
            <ActionLog actions={status?.last_actions ?? []} />
          </div>
        </div>
      </div>
    </main>
  );
}
