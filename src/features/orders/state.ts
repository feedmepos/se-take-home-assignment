import { type PrimitiveAtom, atom, useSetAtom } from 'jotai';
import { store } from '@core/store';
import { botAtomsAtom, type BotAtom, type NullableBotAtom } from '@feat/bots';

export type OrderType = 'NORMAL' | 'VIP';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED';
export type OrderHistoryType = 'CREATED' | 'ASSIGNED' | 'INTERUPPTED' | 'COMPLETED';
export type OrderHistory = { type: OrderHistoryType; timestamp: Date; processor: NullableBotAtom };
export type Order = {
    id: number;
    type: OrderType;
    status: OrderStatus;

    processor: NullableBotAtom;
    createdAt: Date;
    completedAt: Date | null;
    history: OrderHistory[];

    interval: number | null;
    duration: number;
    progress: number;
};
export type OrderAtom = PrimitiveAtom<Order>;
export type NullableOrderAtom = PrimitiveAtom<Order> | PrimitiveAtom<null>;

class OrderFactory {
    private nextId = 1;

    createOrder(type: OrderType, duration: number = 10): Order {
        const order: Order = {
            id: this.nextId,
            type,
            status: 'PENDING',
            processor: atom(null),
            createdAt: new Date(),
            completedAt: null,
            history: [],
            interval: null,
            duration,
            progress: 0,
        };
        order.history.push({ type: 'CREATED', timestamp: new Date(), processor: atom(null) });
        this.nextId++;
        return order;
    }
    createOrderAtom(type: OrderType, duration: number = 10): OrderAtom {
        const order = this.createOrder(type, duration);
        return atom(order);
    }
}
const orderFactory = new OrderFactory();

// Atoms
export const regularOrderAtomsAtom = atom<OrderAtom[]>([]);
export const vipOrderAtomsAtom = atom<OrderAtom[]>([]);
export const completedOrderAtomsAtom = atom<OrderAtom[]>([]);

// Hooks
const useAddOrder = (type: OrderType) => {
    const orderAtomsAtom = type === 'VIP' ? vipOrderAtomsAtom : regularOrderAtomsAtom;
    const setOrderAtoms = useSetAtom(orderAtomsAtom);

    return () => {
        const orderAtom = orderFactory.createOrderAtom(type);
        setOrderAtoms((prev) => [...prev, orderAtom]);
        assignOrderToBot(orderAtom);
        return orderAtom;
    };
};
export const useAddRegularOrder = () => useAddOrder('NORMAL');
export const useAddVipOrder = () => useAddOrder('VIP');

// Functions
function getFirstPendingOrder(queue: PrimitiveAtom<OrderAtom[]>) {
    return store.get(queue).find((orderAtom) => store.get(orderAtom).status === 'PENDING');
}

function getFirstIdleBot() {
    return store.get(botAtomsAtom).find((botAtom) => {
        const orderAtom = store.get(botAtom).currentOrder;
        return store.get(orderAtom) === null;
    });
}

function createOrderInterval(orderAtom: OrderAtom) {
    return window.setInterval(() => {
        const order = store.get(orderAtom);
        if (order.progress >= order.duration) completeOrder(orderAtom);
        else updateProgress(orderAtom);
    }, 1000);
}

// On update of the interval - Simply update the progress
function updateProgress(orderAtom: OrderAtom) {
    store.set(orderAtom, (prev) => ({ ...prev, progress: prev.progress + 1 }));
}

// When an order is completed:
// 1. Stop the interval
// 2. Remove the order from the queue
// 3. Add the order to the completed queue
// 4. Update the order and history
// 5. Remove the order from the processor
// 6. Attempt to reassign the bot to a new order
function completeOrder(orderAtom: OrderAtom) {
    const order = store.get(orderAtom);

    clearInterval(order.interval as number);

    const orderAtomsAtom = order.type === 'VIP' ? vipOrderAtomsAtom : regularOrderAtomsAtom;
    store.set(orderAtomsAtom, (prev) => prev.filter((atom) => atom !== orderAtom));
    store.set(completedOrderAtomsAtom, (prev) => [...prev, orderAtom]);

    store.set(orderAtom, (prev) => ({
        ...prev,
        status: 'COMPLETED',
        completedAt: new Date(),
        interval: null,
        history: [
            ...prev.history,
            { type: 'COMPLETED', timestamp: new Date(), processor: prev.processor },
        ],
    }));

    if (store.get(order.processor)) {
        store.set(order.processor as BotAtom, (prev) => ({ ...prev, currentOrder: atom(null) }));
        assignBotToOrder(order.processor as BotAtom);
    }
}

// Used when:
// 1. A new bot is added
// 2. An order had just been completed
export function assignBotToOrder(botAtom: BotAtom) {
    const pendingOrderAtom =
        getFirstPendingOrder(vipOrderAtomsAtom) ?? getFirstPendingOrder(regularOrderAtomsAtom);
    if (!pendingOrderAtom) return atom(null);

    store.set(botAtom, (prev) => ({ ...prev, currentOrder: pendingOrderAtom }));
    store.set(pendingOrderAtom, (prev) => ({
        ...prev,
        status: 'PROCESSING',
        processor: botAtom,
        history: [...prev.history, { type: 'ASSIGNED', timestamp: new Date(), processor: botAtom }],
        progress: 0,
        interval: createOrderInterval(pendingOrderAtom),
    }));

    return pendingOrderAtom;
}

// Used when:
// 1. A new order is added
// 2. A bot which has the order is removed
export function assignOrderToBot(orderAtom: OrderAtom) {
    const idleBotAtom = getFirstIdleBot();
    if (!idleBotAtom) return atom(null);

    store.set(idleBotAtom, (prev) => ({ ...prev, currentOrder: orderAtom }));
    store.set(orderAtom, (prev) => ({
        ...prev,
        status: 'PROCESSING',
        processor: idleBotAtom,
        history: [
            ...prev.history,
            { type: 'ASSIGNED', timestamp: new Date(), processor: idleBotAtom },
        ],
        progress: 0,
        interval: createOrderInterval(orderAtom),
    }));

    return idleBotAtom;
}
