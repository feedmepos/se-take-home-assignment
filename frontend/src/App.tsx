import { OrderProvider } from "./context/OrderContext";
import { ControlPanel } from "./components/ControlPanel";
import { BotStatus } from "./components/BotStatus";
import { OrderBoard } from "./components/OrderBoard";

export default function App() {
  return (
    <OrderProvider>
      <div className="min-h-screen bg-[#F5F0E8]">
        {/* Header — McDonald's red with golden M branding */}
        <header className="bg-[#DA291C] text-white px-4 py-3 shadow-lg sticky top-0 z-10">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFC72C] flex items-center justify-center shadow-md shrink-0">
                <span className="text-[#DA291C] font-black text-lg leading-none">
                  M
                </span>
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight leading-tight">
                  McDonald's
                </h1>
                <p className="text-[11px] text-red-200 leading-none">
                  Order Controller
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-[11px] text-red-200 font-medium">
                Kitchen Dashboard
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto">
          <ControlPanel />
          {/* BotStatus: visible on mobile/tablet only — desktop shows bots in OrderBoard sidebar */}
          <div className="lg:hidden">
            <BotStatus />
          </div>
          <OrderBoard />
        </main>
      </div>
    </OrderProvider>
  );
}
