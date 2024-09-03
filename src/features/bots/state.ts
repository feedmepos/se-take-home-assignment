import { atom, useAtom, useSetAtom, type PrimitiveAtom } from 'jotai';
import { store } from '@core/store';
import {
    type NullableOrderAtom,
    type OrderAtom,
    assignBotToOrder,
    assignOrderToBot,
} from '@feat/orders';

export type Bot = {
    id: number;
    name: string;
    createdAt: Date;
    currentOrder: NullableOrderAtom;
};
export type BotAtom = PrimitiveAtom<Bot>;
export type NullableBotAtom = PrimitiveAtom<Bot> | PrimitiveAtom<null>;

class BotFactory {
    private nextId = 1;

    generateBot(): Bot {
        const bot: Bot = {
            id: this.nextId,
            name: `Bot ${this.nextId}`,
            createdAt: new Date(),
            currentOrder: atom(null),
        };
        this.nextId++;
        return bot;
    }
    generateBotAtom(): BotAtom {
        const bot = this.generateBot();
        return atom(bot);
    }
}
const botFactory = new BotFactory();

export const botAtomsAtom = atom<BotAtom[]>([]);

// Hooks
export const useAddBot = () => {
    const setBotAtoms = useSetAtom(botAtomsAtom);

    return () => {
        const botAtom = botFactory.generateBotAtom();
        setBotAtoms((prev) => [...prev, botAtom]);
        assignBotToOrder(botAtom);
        return botAtom;
    };
};

export const useRemoveBot = () => {
    const setBotAtoms = useSetAtom(botAtomsAtom);

    return (botAtom: BotAtom) => {
        const orderAtom = unassignBotFromOrder(botAtom);
        setBotAtoms((prev) => prev.filter((atom) => atom !== botAtom));
        if (store.get(orderAtom)) assignOrderToBot(orderAtom as OrderAtom);
        return botAtom;
    };
};

export const useRemoveLastBot = () => {
    const [botAtoms, setBotAtoms] = useAtom(botAtomsAtom);

    return (): NullableBotAtom => {
        if (botAtoms.length === 0) return atom(null);
        const lastBotAtom = botAtoms[botAtoms.length - 1];
        const orderAtom = unassignBotFromOrder(lastBotAtom);
        setBotAtoms((prev) => prev.slice(0, -1));
        if (store.get(orderAtom)) assignOrderToBot(orderAtom as OrderAtom);
        return lastBotAtom;
    };
};

// Functions
function unassignBotFromOrder(botAtom: BotAtom) {
    const orderAtom = store.get(botAtom).currentOrder;
    const order = store.get(orderAtom);
    if (!order) return orderAtom;

    if (order.interval) clearInterval(order.interval as number);

    store.set(orderAtom as OrderAtom, {
        ...order,
        processor: atom(null),
        status: 'PENDING',
        interval: null,
        progress: 0,
        history: [
            ...order.history,
            { type: 'INTERUPPTED', timestamp: new Date(), processor: botAtom },
        ],
    });
    store.set(botAtom, (prev) => ({ ...prev, currentOrder: atom(null) }));

    return orderAtom;
}
