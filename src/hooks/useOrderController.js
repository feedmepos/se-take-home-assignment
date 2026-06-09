import { useCallback, useEffect, useRef, useState } from 'react';

export const PROCESS_TIME_MS = 10_000;

const createInitialState = () => {
	return {
		nextOrderNumber: 1,
		orders: [],
		pendingQueue: [],
		completeQueue: [],
		bots: [],
	};
};

const insertAfterVips = (pendingQueue, orders, orderId) => {
	let insertAt = 0;
	for (let i = 0; i < pendingQueue.length; i++) {
		if (orders[pendingQueue[i]].type === 'vip') {
			insertAt = i + 1;
		}
	}
	pendingQueue.splice(insertAt, 0, orderId);
};

const getInsertIndexByTypeAndId = (pendingQueue, orders, orderId) => {
	const order = orders[orderId];
	for (let i = 0; i < pendingQueue.length; i++) {
		const other = orders[pendingQueue[i]];
		// When restoring a VIP order, and the next order is a normal order, insert before the normal order
		if (order.type === 'vip' && other.type === 'normal') {
			return i;
		}
		// When restoring a normal order, and the next order is a VIP order, skip
		if (order.type === 'normal' && other.type === 'vip') {
			continue;
		}
		// If the order id is greater than the current order id, continue the loop
		// else insert at this index
		if (orderId < pendingQueue[i]) {
			return i;
		}
	}
	return pendingQueue.length;
};

const restoreOrderToQueue = (pendingQueue, orders, orderId) => {
	const insertAt = getInsertIndexByTypeAndId(pendingQueue, orders, orderId);
	pendingQueue.splice(insertAt, 0, orderId);
};

const assignWorkToIdleBots = (draft, onProcessComplete) => {
	const idleBots = draft.bots.filter((b) => b.status === 'idle');
	for (const bot of idleBots) {
		if (draft.pendingQueue.length === 0) break;
		startProcessing(draft, bot.id, onProcessComplete);
	}
};

const startProcessing = (draft, botId, scheduleComplete) => {
	if (draft.pendingQueue.length === 0) return;

	const orderId = draft.pendingQueue[0];
	draft.pendingQueue.shift();

	const order = draft.orders[orderId];
	order.status = 'processing';
	order.botId = botId;

	const bot = draft.bots.find((b) => b.id === botId);
	bot.status = 'processing';
	bot.orderId = orderId;
	bot.processingStartedAt = Date.now();

	scheduleComplete(botId, orderId);
};

const completeOrder = (draft, botId, orderId) => {
	const order = draft.orders[orderId];
	if (!order || order.status !== 'processing') return draft;

	order.status = 'complete';
	order.completedAt = Date.now();
	delete order.botId;
	draft.completeQueue.push(orderId);

	const bot = draft.bots.find((b) => b.id === botId);
	if (bot) {
		bot.status = 'idle';
		bot.orderId = null;
		delete bot.processingStartedAt;
	}

	return draft;
};

const restoreOrderToPending = (draft, orderId) => {
	const order = draft.orders[orderId];
	if (!order) return;

	order.status = 'pending';
	delete order.botId;

	restoreOrderToQueue(draft.pendingQueue, draft.orders, orderId);
};

export const useOrderController = () => {
	const [state, setState] = useState(createInitialState);
	const timersRef = useRef({});
	const scheduleCompleteRef = useRef(null);

	const clearBotTimer = useCallback((botId) => {
		const timer = timersRef.current[botId];
		if (timer) {
			clearTimeout(timer);
			delete timersRef.current[botId];
		}
	}, []);

	const scheduleComplete = useCallback(
		(botId, orderId) => {
			clearBotTimer(botId);
			timersRef.current[botId] = setTimeout(() => {
				delete timersRef.current[botId];
				setState((prev) => {
					const draft = structuredClone(prev);
					completeOrder(draft, botId, orderId);
					assignWorkToIdleBots(draft, scheduleCompleteRef.current);
					return draft;
				});
			}, PROCESS_TIME_MS);
		},
		[clearBotTimer],
	);

	useEffect(() => {
		scheduleCompleteRef.current = scheduleComplete;
	}, [scheduleComplete]);

	useEffect(() => {
		return () => {
			Object.values(timersRef.current).forEach(clearTimeout);
			timersRef.current = {};
		};
	}, []);

	const addNormalOrder = useCallback(() => {
		setState((prev) => {
			const draft = structuredClone(prev);
			const id = draft.nextOrderNumber++;
			draft.orders[id] = {
				id,
				type: 'normal',
				status: 'pending',
				createdAt: Date.now(),
			};
			draft.pendingQueue.push(id);
			assignWorkToIdleBots(draft, scheduleComplete);
			return draft;
		});
	}, [scheduleComplete]);

	const addVipOrder = useCallback(() => {
		setState((prev) => {
			const draft = structuredClone(prev);
			const id = draft.nextOrderNumber++;
			draft.orders[id] = {
				id,
				type: 'vip',
				status: 'pending',
				createdAt: Date.now(),
			};
			insertAfterVips(draft.pendingQueue, draft.orders, id);
			assignWorkToIdleBots(draft, scheduleComplete);
			return draft;
		});
	}, [scheduleComplete]);

	const addBot = useCallback(() => {
		setState((prev) => {
			const draft = structuredClone(prev);
			const botId = draft.bots.length + 1;
			draft.bots.push({ id: botId, status: 'idle', orderId: null });
			assignWorkToIdleBots(draft, scheduleComplete);
			return draft;
		});
	}, [scheduleComplete]);

	const removeBot = useCallback(() => {
		setState((prev) => {
			if (prev.bots.length === 0) return prev;

			const draft = structuredClone(prev);
			const bot = draft.bots[draft.bots.length - 1];
			clearBotTimer(bot.id);

			if (bot.status === 'processing' && bot.orderId != null) {
				restoreOrderToPending(draft, bot.orderId);
			}

			draft.bots.pop();
			assignWorkToIdleBots(draft, scheduleComplete);
			return draft;
		});
	}, [clearBotTimer, scheduleComplete]);

	const pendingOrders = state.pendingQueue.map((id) => state.orders[id]);
	const completeOrders = state.completeQueue.map((id) => state.orders[id]);
	const activeBotCount = state.bots.filter(
		(bot) => bot.status === 'processing',
	).length;

	return {
		bots: state.bots,
		pendingOrders,
		completeOrders,
		nextOrderId: state.nextOrderNumber,
		activeBotCount,
		addNormalOrder,
		addVipOrder,
		addBot,
		removeBot,
		getOrder: (id) => state.orders[id],
		totalBots: state.bots.length,
	};
};
