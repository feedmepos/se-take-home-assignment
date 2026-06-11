import { useCallback, useEffect, useRef, useState } from 'react';

export const PROCESS_TIME_MS = 10_000;
export const FAST_PROCESS_TIME_MS = PROCESS_TIME_MS / 2;
export const CANCELLATION_TIME_MS = 2_000;
const MIN_REMAINING_FOR_REASSIGN_MS = 6_000;

export const getProcessTimeMs = (bot) =>
	bot.type === 'fast' ? FAST_PROCESS_TIME_MS : PROCESS_TIME_MS;

const getRemainingProcessMs = (bot, now) => {
	if (bot.processingStartedAt == null) return 0;
	return Math.max(0, getProcessTimeMs(bot) - (now - bot.processingStartedAt));
};

const createInitialState = () => {
	return {
		nextOrderNumber: 1,
		orders: [],
		pendingQueue: [],
		completeQueue: [],
		bots: [],
	};
};

const insertNewVipOrder = (pendingQueue, orders, orderId) => {
	let insertAt = 0;
	for (let i = 0; i < pendingQueue.length; i++) {
		if (orders[pendingQueue[i]].type === 'vip') {
			insertAt = i + 1;
		}
	}
	pendingQueue.splice(insertAt, 0, orderId);
};

const getOrderPosition = (pendingQueue, orders, orderId) => {
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
	const insertAt = getOrderPosition(pendingQueue, orders, orderId);
	pendingQueue.splice(insertAt, 0, orderId);
};

const findLastBotIndexByType = (bots, type) => {
	for (let i = bots.length - 1; i >= 0; i--) {
		if (bots[i].type === type) return i;
	}
	return -1;
};

const cancelBot = (draft, orderId) => {
	const order = draft.orders[orderId];
	if (!order) return;

	order.status = 'pending';
	delete order.botId;
	delete order.pickedUpAt;

	restoreOrderToQueue(draft.pendingQueue, draft.orders, orderId);
};

const isVipOrder = (orders, orderId) => orders[orderId]?.type === 'vip';

const hasPendingVipOrder = (pendingQueue, orders) =>
	pendingQueue.some((id) => isVipOrder(orders, id));

const hasProcessingVipOnNormalBot = (bots, orders) =>
	bots.some(
		(b) =>
			b.type === 'normal' &&
			(b.status === 'processing' || b.status === 'cancelling') &&
			b.orderId != null &&
			isVipOrder(orders, b.orderId),
	);

const hasOutstandingVipWork = (draft) => {
	if (hasPendingVipOrder(draft.pendingQueue, draft.orders)) return true;
	if (hasProcessingVipOnNormalBot(draft.bots, draft.orders)) return true;
	return draft.bots.some(
		(b) =>
			b.type === 'fast' &&
			b.status === 'reserved' &&
			b.reservedForOrderId != null &&
			isVipOrder(draft.orders, b.reservedForOrderId),
	);
};

const pickOrderForFastBot = (draft) => {
	const { pendingQueue, orders } = draft;

	for (let i = 0; i < pendingQueue.length; i++) {
		if (isVipOrder(orders, pendingQueue[i])) {
			return { orderId: pendingQueue[i], index: i };
		}
	}

	if (hasOutstandingVipWork(draft) || pendingQueue.length === 0) {
		return null;
	}

	return { orderId: pendingQueue[0], index: 0 };
};

const pickOrderForBot = (bot, draft) => {
	if (bot.type === 'fast') {
		return pickOrderForFastBot(draft);
	}

	if (draft.pendingQueue.length === 0) return null;
	return { orderId: draft.pendingQueue[0], index: 0 };
};

const findNormalBotForReassignment = (draft, now, orderType) =>
	draft.bots.find(
		(b) =>
			b.type === 'normal' &&
			b.status === 'processing' &&
			b.orderId != null &&
			draft.orders[b.orderId].type === orderType &&
			getRemainingProcessMs(b, now) >= MIN_REMAINING_FOR_REASSIGN_MS,
	);

const startProcessingOrder = (draft, botId, orderId, scheduleComplete) => {
	const bot = draft.bots.find((b) => b.id === botId);
	const order = draft.orders[orderId];

	order.status = 'processing';
	order.botId = botId;
	if (order.pickedUpAt == null) {
		order.pickedUpAt = Date.now();
	}

	bot.status = 'processing';
	bot.orderId = orderId;
	bot.processingStartedAt = Date.now();
	delete bot.cancellationStartedAt;
	delete bot.reassignToFastBotId;
	delete bot.remainingMsAtCancellation;
	delete bot.reservedForOrderId;

	scheduleComplete(botId, orderId, getProcessTimeMs(bot));
};

const startProcessingFromQueue = (draft, botId, scheduleComplete) => {
	const bot = draft.bots.find((b) => b.id === botId);
	const pick = pickOrderForBot(bot, draft);
	if (!pick) return;

	const { orderId, index } = pick;
	draft.pendingQueue.splice(index, 1);
	startProcessingOrder(draft, botId, orderId, scheduleComplete);
};

const releaseReservedFastBot = (draft, fastBotId) => {
	const fastBot = draft.bots.find((b) => b.id === fastBotId);
	if (!fastBot || fastBot.status !== 'reserved') return;

	fastBot.status = 'idle';
	delete fastBot.reservedForOrderId;
};

const initiateCancellation = (
	draft,
	normalBot,
	fastBot,
	clearBotTimer,
	scheduleCancellation,
) => {
	const orderId = normalBot.orderId;
	if (orderId == null) return;

	clearBotTimer(normalBot.id);

	const order = draft.orders[orderId];
	order.status = 'cancelling';

	normalBot.status = 'cancelling';
	normalBot.cancellationStartedAt = Date.now();
	normalBot.reassignToFastBotId = fastBot.id;
	normalBot.remainingMsAtCancellation = getRemainingProcessMs(
		normalBot,
		Date.now(),
	);

	fastBot.status = 'reserved';
	fastBot.reservedForOrderId = orderId;

	scheduleCancellation(normalBot.id, orderId, fastBot.id);
};

const abortCancellation = (draft, normalBot, clearBotTimer, scheduleComplete) => {
	clearBotTimer(normalBot.id);
	releaseReservedFastBot(draft, normalBot.reassignToFastBotId);

	const orderId = normalBot.orderId;
	const order = orderId != null ? draft.orders[orderId] : null;
	const remainingMs = normalBot.remainingMsAtCancellation;

	normalBot.status = 'processing';
	delete normalBot.cancellationStartedAt;
	delete normalBot.reassignToFastBotId;
	delete normalBot.remainingMsAtCancellation;

	if (order && orderId != null && remainingMs != null) {
		order.status = 'processing';
		normalBot.processingStartedAt =
			Date.now() - (getProcessTimeMs(normalBot) - remainingMs);
		scheduleComplete(normalBot.id, orderId, remainingMs);
	}
};

const completeCancellation = (
	draft,
	normalBotId,
	orderId,
	fastBotId,
	scheduleComplete,
) => {
	const normalBot = draft.bots.find((b) => b.id === normalBotId);
	const fastBot = draft.bots.find((b) => b.id === fastBotId);

	if (normalBot) {
		normalBot.status = 'idle';
		normalBot.orderId = null;
		delete normalBot.processingStartedAt;
		delete normalBot.cancellationStartedAt;
		delete normalBot.reassignToFastBotId;
		delete normalBot.remainingMsAtCancellation;
	}

	if (!fastBot || fastBot.status !== 'reserved') {
		cancelBot(draft, orderId);
		return;
	}

	releaseReservedFastBot(draft, fastBotId);
	startProcessingOrder(draft, fastBotId, orderId, scheduleComplete);
};

const tryReassignOrdersToFastBots = (
	draft,
	clearBotTimer,
	scheduleCancellation,
) => {
	const now = Date.now();
	const idleFastBots = draft.bots.filter(
		(b) => b.status === 'idle' && b.type === 'fast',
	);

	for (const fastBot of idleFastBots) {
		let normalBot = findNormalBotForReassignment(draft, now, 'vip');

		if (!normalBot && !hasOutstandingVipWork(draft)) {
			normalBot = findNormalBotForReassignment(draft, now, 'normal');
		}

		if (!normalBot) break;

		initiateCancellation(
			draft,
			normalBot,
			fastBot,
			clearBotTimer,
			scheduleCancellation,
		);
	}
};

const assignWorkToIdleBots = (
	draft,
	scheduleComplete,
	scheduleCancellation,
	clearBotTimer,
) => {
	tryReassignOrdersToFastBots(draft, clearBotTimer, scheduleCancellation);

	const idleFastBots = draft.bots.filter(
		(b) => b.status === 'idle' && b.type === 'fast',
	);
	for (const bot of idleFastBots) {
		startProcessingFromQueue(draft, bot.id, scheduleComplete);
	}

	const idleNormalBots = draft.bots.filter(
		(b) => b.status === 'idle' && b.type === 'normal',
	);
	for (const bot of idleNormalBots) {
		if (draft.pendingQueue.length === 0) break;
		startProcessingFromQueue(draft, bot.id, scheduleComplete);
	}
};

const completeOrder = (draft, botId, orderId) => {
	const order = draft.orders[orderId];
	if (!order || order.status !== 'processing') return draft;

	const completedAt = Date.now();
	order.status = 'complete';
	order.completedAt = completedAt;
	if (order.pickedUpAt != null) {
		order.totalProcessTimeMs = completedAt - order.pickedUpAt;
	}
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

export const useOrderController = () => {
	const [state, setState] = useState(createInitialState);
	const timersRef = useRef({});
	const scheduleCompleteRef = useRef(null);
	const scheduleCancellationRef = useRef(null);

	const clearBotTimer = useCallback((botId) => {
		const timer = timersRef.current[botId];
		if (timer) {
			clearTimeout(timer);
			delete timersRef.current[botId];
		}
	}, []);

	const scheduleComplete = useCallback(
		(botId, orderId, processTimeMs) => {
			clearBotTimer(botId);
			timersRef.current[botId] = setTimeout(() => {
				delete timersRef.current[botId];
				setState((prev) => {
					const draft = structuredClone(prev);
					completeOrder(draft, botId, orderId);
					assignWorkToIdleBots(
						draft,
						scheduleCompleteRef.current,
						scheduleCancellationRef.current,
						clearBotTimer,
					);
					return draft;
				});
			}, processTimeMs);
		},
		[clearBotTimer],
	);

	const scheduleCancellation = useCallback(
		(normalBotId, orderId, fastBotId) => {
			clearBotTimer(normalBotId);
			timersRef.current[normalBotId] = setTimeout(() => {
				delete timersRef.current[normalBotId];
				setState((prev) => {
					const draft = structuredClone(prev);
					completeCancellation(
						draft,
						normalBotId,
						orderId,
						fastBotId,
						scheduleCompleteRef.current,
					);
					assignWorkToIdleBots(
						draft,
						scheduleCompleteRef.current,
						scheduleCancellationRef.current,
						clearBotTimer,
					);
					return draft;
				});
			}, CANCELLATION_TIME_MS);
		},
		[clearBotTimer],
	);

	useEffect(() => {
		scheduleCompleteRef.current = scheduleComplete;
	}, [scheduleComplete]);

	useEffect(() => {
		scheduleCancellationRef.current = scheduleCancellation;
	}, [scheduleCancellation]);

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
			assignWorkToIdleBots(
				draft,
				scheduleComplete,
				scheduleCancellation,
				clearBotTimer,
			);
			return draft;
		});
	}, [scheduleComplete, scheduleCancellation, clearBotTimer]);

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
			insertNewVipOrder(draft.pendingQueue, draft.orders, id);
			assignWorkToIdleBots(
				draft,
				scheduleComplete,
				scheduleCancellation,
				clearBotTimer,
			);
			return draft;
		});
	}, [scheduleComplete, scheduleCancellation, clearBotTimer]);

	const addBot = useCallback(() => {
		setState((prev) => {
			const draft = structuredClone(prev);
			const botId = draft.bots.length + 1;
			draft.bots.push({
				id: botId,
				status: 'idle',
				orderId: null,
				type: 'normal',
			});
			assignWorkToIdleBots(
				draft,
				scheduleComplete,
				scheduleCancellation,
				clearBotTimer,
			);
			return draft;
		});
	}, [scheduleComplete, scheduleCancellation, clearBotTimer]);

	const addFastBot = useCallback(() => {
		setState((prev) => {
			const draft = structuredClone(prev);
			const botId = draft.bots.length + 1;
			draft.bots.push({
				id: botId,
				status: 'idle',
				orderId: null,
				type: 'fast',
			});
			assignWorkToIdleBots(
				draft,
				scheduleComplete,
				scheduleCancellation,
				clearBotTimer,
			);
			return draft;
		});
	}, [scheduleComplete, scheduleCancellation, clearBotTimer]);

	const removeBotByType = useCallback(
		(type) => {
			setState((prev) => {
				const botIndex = findLastBotIndexByType(prev.bots, type);
				if (botIndex === -1) return prev;

				const draft = structuredClone(prev);
				const bot = draft.bots[botIndex];
				clearBotTimer(bot.id);

				if (bot.status === 'cancelling' && bot.orderId != null) {
					releaseReservedFastBot(draft, bot.reassignToFastBotId);
					cancelBot(draft, bot.orderId);
				} else if (bot.status === 'processing' && bot.orderId != null) {
					cancelBot(draft, bot.orderId);
				} else if (bot.status === 'reserved') {
					const linkedNormalBot = draft.bots.find(
						(b) =>
							b.status === 'cancelling' &&
							b.reassignToFastBotId === bot.id,
					);
					if (linkedNormalBot) {
						abortCancellation(
							draft,
							linkedNormalBot,
							clearBotTimer,
							scheduleComplete,
						);
					}
				}

				draft.bots.splice(botIndex, 1);
				assignWorkToIdleBots(
					draft,
					scheduleComplete,
					scheduleCancellation,
					clearBotTimer,
				);
				return draft;
			});
		},
		[clearBotTimer, scheduleComplete, scheduleCancellation],
	);

	const removeBot = useCallback(
		() => removeBotByType('normal'),
		[removeBotByType],
	);

	const removeFastBot = useCallback(
		() => removeBotByType('fast'),
		[removeBotByType],
	);

	const pendingOrders = state.pendingQueue.map((id) => state.orders[id]);
	const completeOrders = state.completeQueue.map((id) => state.orders[id]);
	const activeBotCount = state.bots.filter(
		(bot) => bot.status === 'processing' || bot.status === 'cancelling',
	).length;

	const totalFastBots = state.bots.filter(
		(bot) => bot.type === 'fast',
	).length;
	const totalNormalBots = state.bots.filter(
		(bot) => bot.type === 'normal',
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
		addFastBot,
		removeFastBot,
		getOrder: (id) => state.orders[id],
		totalBots: state.bots.length,
		totalFastBots,
		totalNormalBots,
	};
};
