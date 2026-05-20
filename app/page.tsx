import { AppProvider } from '../context/AppContext';
import { BotList } from '../components/BotList';
import { ControlPanel } from '../components/ControlPanel';
import { OrderQueue } from '../components/OrderQueue';

export default function Home() {
  return (
    <AppProvider>
      <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,199,44,0.22),_transparent_34%),radial-gradient(circle_at_85%_10%,_rgba(218,41,28,0.16),_transparent_24%),linear-gradient(180deg,_#fff8e7_0%,_#f8fafc_42%,_#eef2ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute left-[-8rem] top-20 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[-6rem] top-[22rem] h-72 w-72 rounded-full bg-rose-400/10 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
          <header className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(0,0,0,0.09)] backdrop-blur">
            <div className="h-2 bg-gradient-to-r from-[#DA291C] via-[#FFC72C] to-[#DA291C]" />
            <div className="p-6 sm:p-8">
              <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.28em] text-red-700">
                Real-time kitchen flow
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Live kitchen queue dashboard
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                Create VIP and normal orders, add or remove bots, and watch orders move through the
                queue in real time.
              </p>
            </div>
          </header>

          <ControlPanel />
          <BotList />
          <OrderQueue />
        </div>
      </main>
    </AppProvider>
  );
}
