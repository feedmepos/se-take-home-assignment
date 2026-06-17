// Thin "use client" boundary — composition only; zero domain logic here.
'use client';

import { BotShelf } from '@/components/bot-shelf';
import { CompleteColumn } from '@/components/complete-column';
import { Controls } from '@/components/controls';
import { PendingColumn } from '@/components/pending-column';

export default function Page() {
  return (
    <main className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">
          🍔
        </span>
        <div>
          <h1 className="text-xl font-bold leading-tight">McDonald&apos;s Order Controller</h1>
          <p className="text-xs text-slate-500">
            Cooking-bot order management — in-memory prototype
          </p>
        </div>
      </header>

      <Controls />

      <div className="flex gap-6 items-start">
        <PendingColumn />
        <CompleteColumn />
        <BotShelf />
      </div>
    </main>
  );
}
