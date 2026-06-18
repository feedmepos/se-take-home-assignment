// Thin "use client" boundary — composition only; zero domain logic here.
'use client';

import { BotShelf } from '@/components/bot-shelf';
import { CompleteColumn } from '@/components/complete-column';
import { Controls } from '@/components/controls';
import { PendingColumn } from '@/components/pending-column';

export default function Page() {
  return (
    <main className="max-w-5xl mx-auto p-5 flex flex-col gap-5">
      {/* Brand header — McDonald's red with a gold accent stripe */}
      <header className="rounded-xl bg-[#DA291C] px-6 py-4 flex items-center gap-4 shadow-md">
        <span className="text-4xl leading-none" aria-hidden="true">
          🍔
        </span>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white leading-tight">
            McDonald&apos;s Order Controller
          </h1>
          <p className="text-xs text-red-200 mt-0.5">Automated cooking-bot order management</p>
        </div>
        {/* Gold accent chip — purely decorative brand touch */}
        <div className="h-8 w-1.5 rounded-full bg-[#FFC72C]" aria-hidden="true" />
      </header>

      <Controls />

      {/* Three-column board — flex-wrap so it reflows on narrow viewports */}
      <div className="flex flex-wrap gap-4 items-start">
        <PendingColumn />
        <CompleteColumn />
        <BotShelf />
      </div>
    </main>
  );
}
