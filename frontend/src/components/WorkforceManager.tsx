import React from "react";
import { Bot, Minus, Plus } from "lucide-react";

interface WorkforceManagerProps {
  activeBots: number;
  onScale: (delta: number) => Promise<void>;
}

export function WorkforceManager({ activeBots, onScale }: WorkforceManagerProps) {
  return (
    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Bot className="w-5 h-5 text-blue-500" />
        Workforce Management
      </h2>
      <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
        <div>
          <p className="text-slate-500 font-medium">Available Cooking Bots</p>
          <p className="text-3xl font-black text-slate-900">{activeBots}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => onScale(-1)}
            aria-label="Decrease Bots"
            className="w-14 h-14 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-90 transition-all shadow-sm flex items-center justify-center"
          >
            <Minus className="w-6 h-6" />
          </button>
          <button 
            onClick={() => onScale(1)}
            aria-label="Increase Bots"
            className="w-14 h-14 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 active:scale-90 transition-all shadow-sm flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
