import { Controls } from "./components/Controls";
import { BotList } from "./components/BotList";
import { OrderList } from "./components/OrderList";
import { CompleteList } from "./components/CompleteList";

function App() {
  return (
    <div className="min-h-screen bg-yellow-50 font-sans w-full flex justify-center">
      <div className="w-full max-w-5xl p-6">
        <div className="bg-red-600 text-white py-4 mb-8">
          <h1 className="text-2xl font-bold text-center">
            FeedMe McDonald's Order Controller
          </h1>
        </div>

        <Controls />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BotList />
          <OrderList />
          <CompleteList />
        </div>
      </div>
    </div>
  );
}

export default App;
