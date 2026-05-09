"use client";

import type { OrderType } from "../types";

export function ControlPanel({ onAddOrder, onAddBot, onRemoveBot }: {
  onAddOrder: (type: OrderType) => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
}) {
  const groups = [
    {
      title: "📋 Orders",
      buttons: [
        { id: "btnNewNormal", className: "btn-normal", label: "New Normal Order", onClick: () => onAddOrder("normal") },
        { id: "btnNewVIP", className: "btn-vip", label: "New VIP Order", onClick: () => onAddOrder("vip") },
      ],
    },
    {
      title: "🤖 Bots",
      buttons: [
        { id: "btnAddBot", className: "btn-add-bot", icon: "", label: "+ Bot", onClick: onAddBot },
        { id: "btnRemoveBot", className: "btn-remove-bot", icon: "", label: "- Bot", onClick: onRemoveBot },
      ],
    },
  ];

  return (
    <section className="controls">
      {groups.map((g) => (
        <div key={g.title} className="control-group">
          <h3>{g.title}</h3>
          <div className="control-buttons">
            {g.buttons.map((b) => (
              <button key={b.id} id={b.id} className={`btn ${b.className}`} onClick={b.onClick}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
