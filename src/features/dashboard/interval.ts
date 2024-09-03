import { atom } from 'jotai';
import { store } from '@core/store';
import { vipOrderAtomsAtom, regularOrderAtomsAtom, completedOrderAtomsAtom } from '@feat/orders';
import { botAtomsAtom } from '@feat/bots';

type OrderPerformanceEntry = {
    timestamp: number;
    total: number;
    completed: number;
};
type BotPerformanceEntry = {
    timestamp: number;
    total: number;
    idle: number;
    processing: number;
};

export const orderPerformanceAtom = atom<OrderPerformanceEntry[]>([]);
export const botPerformanceAtom = atom<BotPerformanceEntry[]>([]);

export const initializeOrderPerformanceInterval = () =>
    setInterval(() => {
        const regularOrderAtoms = store.get(regularOrderAtomsAtom);
        const vipOrderAtoms = store.get(vipOrderAtomsAtom);
        const completedOrderAtoms = store.get(completedOrderAtomsAtom);

        const total = regularOrderAtoms.length + vipOrderAtoms.length + completedOrderAtoms.length;
        const completed = completedOrderAtoms.length;

        store.set(orderPerformanceAtom, (prev) => {
            const entry = { timestamp: Date.now(), total, completed };
            if (prev.length > 120) return [...prev.slice(1), entry];
            return [...prev, entry];
        });
    }, 1000);

export const initializeBotPerformanceInterval = () =>
    setInterval(() => {
        const botAtoms = store.get(botAtomsAtom);
        const total = botAtoms.length;
        const { idle, processing } = botAtoms.reduce(
            (result, botAtom) => {
                const bot = store.get(botAtom);
                const order = store.get(bot.currentOrder);
                result.idle += order ? 0 : 1;
                result.processing += order ? 1 : 0;
                return result;
            },
            { idle: 0, processing: 0 }
        );
        store.set(botPerformanceAtom, (prev) => {
            const entry = { timestamp: Date.now(), total, idle, processing };
            if (prev.length > 120) return [...prev.slice(1), entry];
            return [...prev, entry];
        });
    }, 1000);
