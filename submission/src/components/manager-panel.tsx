"use client";
import { BotDTO } from "@/models/bot";
import useSWR from "swr";

export function ManagerPanel() {
  const res = useSWR<BotDTO[]>("/api/v1/bots", {
    refreshInterval: 1000,
  });
  const bots = res.data ?? [];

  const addBot = async () => {
    await fetch("/api/v1/bots", {
      method: "POST",
    });

    res.mutate();
  };

  const removeBot = async () => {
    const botId = bots.at(-1)?.id;
    if (!botId) return;
    await fetch(`/api/v1/bots/${botId}`, {
      method: "DELETE",
    });
    await res.mutate();
  };

  return (
    <div className="bg-neutral-50 rounded-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-lg">Manager panel</h4>
          <span className="text-neutral-400 italic text-sm">
            (For staffs only)
          </span>
        </div>
        <div className="flex items-center space-x-4 justify-end">
          <span className="font-bold">Bots: {bots.length ?? 0}</span>
          <button
            onClick={addBot}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            + Bot
          </button>
          <button
            onClick={removeBot}
            className={`bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded ${bots.length <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={bots.length <= 0}
          >
            - Bot
          </button>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
          Deployed Bots ({bots.length})
        </h2>
        <div className="overflow-y-auto max-h-[60vh]">
          {bots.length > 0 ? (
            bots.map((bot) => (
              <div key={bot.id} className="space-x-2">
                <span>Bot #{bot.id}</span>
                <span>-</span>
                <span
                  className={bot.order ? "text-green-500" : "text-gray-500"}
                >
                  {bot.order ? `Processing - ${bot.order.id}` : "Idle"}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No bots deployed</p>
          )}
        </div>
      </div>
    </div>
  );
}
