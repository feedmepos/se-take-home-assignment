export type BotStatus = 'IDLE' | 'PROCESSING';
export interface IBot {
    id: number;
    status: BotStatus;
    currentOrderId: number | null;
}
export declare class Bot implements IBot {
    id: number;
    status: BotStatus;
    currentOrderId: number | null;
    processingTimeout: NodeJS.Timeout | null;
    constructor(id: number);
    toString(): string;
    toJSON(): IBot;
}
//# sourceMappingURL=Bot.d.ts.map