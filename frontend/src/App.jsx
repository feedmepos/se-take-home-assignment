import { useState, useRef } from "react";

const PROCESSING_TIME = 10000;

function App() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [processingOrders, setProcessingOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [bots, setBots] = useState([]);

  const orderIDRef = useRef(0);
  const botIDRef = useRef(0);

  const pendingRef = useRef([]);
  const processingRef = useRef([]);
  const botsRef = useRef([]);

  const syncPending = (orders) => {
    pendingRef.current = orders;
    setPendingOrders([...orders]);
  };

  const syncProcessing = (orders) => {
    processingRef.current = orders;
    setProcessingOrders([...orders]);
  };

  const syncBots = (newBots) => {
    botsRef.current = newBots;
    setBots([...newBots]);
  };

  const assignOrders = () => {
    const pending = [...pendingRef.current];
    const processing = [...processingRef.current];
    const updatedBots = [...botsRef.current];

    updatedBots.forEach((bot) => {
      if (!bot.busy && pending.length > 0) {
        const order = pending.shift();

        bot.busy = true;
        bot.currentOrder = order;

        processing.push({
          ...order,
          botId: bot.id,
        });

        bot.timer = setTimeout(() => {
          processingRef.current = processingRef.current.filter(
            (o) => o.id !== order.id,
          );

          setCompletedOrders((prev) => [
            ...prev,
            {
              ...order,
              completedAt: new Date().toLocaleTimeString(),
            },
          ]);

          bot.busy = false;
          bot.currentOrder = null;
          bot.timer = null;

          setProcessingOrders([...processingRef.current]);
          setBots([...botsRef.current]);

          assignOrders();
        }, PROCESSING_TIME);
      }
    });

    pendingRef.current = pending;
    processingRef.current = processing;
    botsRef.current = updatedBots;

    setPendingOrders([...pending]);
    setProcessingOrders([...processing]);
    setBots([...updatedBots]);
  };

  const addNormalOrder = () => {
    const order = {
      id: orderIDRef.current++,
      type: "NORMAL",
    };

    const updated = [...pendingRef.current, order];
    syncPending(updated);
    assignOrders();
  };

  const addVIPOrder = () => {
    const order = {
      id: orderIDRef.current++,
      type: "VIP",
    };

    const pending = [...pendingRef.current];

    const firstNormal = pending.findIndex((o) => o.type === "NORMAL");

    if (firstNormal === -1) {
      pending.push(order);
    } else {
      pending.splice(firstNormal, 0, order);
    }

    syncPending(pending);
    assignOrders();
  };

  const addBot = () => {
    const bot = {
      id: botIDRef.current++,
      busy: false,
      currentOrder: null,
      timer: null,
    };

    const updated = [...botsRef.current, bot];
    syncBots(updated);
    assignOrders();
  };

  const removeBot = () => {
    if (botsRef.current.length === 0) return;

    const botsCopy = [...botsRef.current];
    const bot = botsCopy.pop();

    if (bot.busy && bot.currentOrder) {
      clearTimeout(bot.timer);

      const order = bot.currentOrder;

      processingRef.current = processingRef.current.filter(
        (o) => o.id !== order.id,
      );

      let pending = [...pendingRef.current];

      if (order.type === "VIP") {
        const firstNormal = pending.findIndex((o) => o.type === "NORMAL");

        if (firstNormal === -1) pending.push(order);
        else pending.splice(firstNormal, 0, order);
      } else {
        pending.push(order);
      }

      syncPending(pending);
      syncProcessing(processingRef.current);
    }

    syncBots(botsCopy);
    assignOrders();
  };

  return (
    <div className="container">
      <h1>McDonald's Order Management</h1>

      <div className="controls">
        <button onClick={addNormalOrder}>New Order</button>
        <button onClick={addVIPOrder}>VIP Order</button>
        <button onClick={addBot}>Add Bot</button>
        <button onClick={removeBot}>Remove Bot</button>
      </div>

      <div className="status">
        <div>Total Bots: {bots.length}</div>
        <div>Processing: {processingOrders.length}</div>
        <div>Pending: {pendingOrders.length}</div>
        <div>Completed: {completedOrders.length}</div>
      </div>
      <div className="dashboard">
        {/* Pending */}
        <div className="bar">
          <h2>Pending</h2>
          {pendingOrders.map((order) => (
            <div key={order.id} className={`card ${order.type}`}>
              #{order.id} - {order.type}
            </div>
          ))}
        </div>
        <div className="bar">
          <h2>Processing</h2>
          {processingOrders.map((order) => (
            <div key={order.id} className={`card ${order.type}`}>
              #{order.id} - {order.type}
              <br />
              Bot {order.botId}
            </div>
          ))}
        </div>
        <div className="bar">
          <h2>Completed</h2>
          {completedOrders.map((order) => (
            <div key={order.id} className="card completed">
              #{order.id} - {order.type}
              <br />
              {order.completedAt}
            </div>
          ))}
        </div>
        <div className="bots">
          <h2>Bots</h2>

          {bots.length === 0 && <p>No bots available</p>}

          {bots.map((bot) => (
            <div key={bot.id} className="bot-card">
              Bot {bot.id} -{" "}
              {bot.busy && bot.currentOrder
                ? `Processing Order #${bot.currentOrder.id}`
                : "Idle"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
