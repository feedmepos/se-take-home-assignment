import React, { useState } from "react";
import { Plus, Users, Zap } from "lucide-react";

interface OrderFormProps {
  onCreateOrder: (name: string, type: "normal" | "vip") => Promise<void>;
  isSubmitting: boolean;
}

export function OrderForm({ onCreateOrder, isSubmitting }: OrderFormProps) {
  const [customerName, setCustomerName] = useState("");

  const handleSubmit = async (type: "normal" | "vip") => {
    const name = customerName || (type === "vip" ? "VIP Guest" : "Guest");
    await onCreateOrder(name, type);
    setCustomerName("");
  };

  return (
    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Plus className="w-5 h-5 text-mcdonalds-red" />
        Place New Order
      </h2>
      <div className="flex flex-col md:flex-row gap-4">
        <input 
          type="text"
          placeholder="Customer Name (Optional)"
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mcdonalds-yellow/50 transition-all font-medium text-slate-700 placeholder:text-slate-400"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          disabled={isSubmitting}
        />
        <div className="flex gap-4">
          <button 
            onClick={() => handleSubmit("normal")}
            disabled={isSubmitting}
            className="flex-1 md:flex-none px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Users className="w-5 h-5" /> Normal
          </button>
          <button 
            onClick={() => handleSubmit("vip")}
            disabled={isSubmitting}
            className="flex-1 md:flex-none px-8 py-3 bg-mcdonalds-yellow text-slate-900 font-bold rounded-xl hover:bg-yellow-400 active:scale-95 transition-all shadow-lg shadow-mcdonalds-yellow/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Zap className="w-5 h-5" /> VIP
          </button>
        </div>
      </div>
    </section>
  );
}
