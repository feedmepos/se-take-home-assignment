import { PROCESS_TIME_MS } from '../hooks/useOrderController';

export const TOTAL_SECONDS = PROCESS_TIME_MS / 1000;

export const getCookingProgress = (startedAt, now) => {
	const elapsed = now - startedAt;
	const percent = Math.min(100, (elapsed / PROCESS_TIME_MS) * 100);
	const secondsLeft = Math.max(
		0,
		Math.ceil((PROCESS_TIME_MS - elapsed) / 1000),
	);
	const secondsElapsed = Math.min(TOTAL_SECONDS, Math.floor(elapsed / 1000));
	return { percent, secondsLeft, secondsElapsed };
};
