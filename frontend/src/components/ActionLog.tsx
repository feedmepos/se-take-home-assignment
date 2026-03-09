import React from "react";
import { Terminal } from "lucide-react";

interface ActionLogProps {
  actions: string[];
}

export function ActionLog({ actions }: ActionLogProps) {
  return (
    <section className="bg-slate-900 text-slate-300 p-8 rounded-3xl shadow-xl h-full flex flex-col border border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          System Actions
        </h2>
        <div className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded">
          LIVE_LOG_v1
        </div>
      </div>
      <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] lg:max-h-none pr-2 custom-scrollbar">
        {actions.length === 0 && (
          <div className="py-8 text-center text-slate-600 font-mono text-sm italic">
            Waiting for actions...
          </div>
        )}
        {actions.map((action, i) => (
          <div 
            key={i} 
            className={`font-mono text-sm p-3 rounded-xl border transition-all ${i === 0 ? 'bg-slate-800/50 border-emerald-500/30 text-emerald-50' : 'bg-slate-800/20 border-slate-800 text-slate-400'}`}
          >
            <span className="text-emerald-500 mr-2 font-bold">{'>'}</span> {action}
          </div>
        ))}
      </div>
    </section>
  );
}
