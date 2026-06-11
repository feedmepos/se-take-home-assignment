import {
	CANCELLATION_TIME_MS,
	PROCESS_TIME_MS,
} from '../hooks/useOrderController';

export const TOTAL_SECONDS = PROCESS_TIME_MS / 1000;
export const CANCELLATION_SECONDS = CANCELLATION_TIME_MS / 1000;

export const getCookingProgress = (startedAt, now, processTimeMs = PROCESS_TIME_MS) => {
	const totalSeconds = processTimeMs / 1000;
	const elapsed = now - startedAt;
	const percent = Math.min(100, (elapsed / processTimeMs) * 100);
	const secondsLeft = Math.max(
		0,
		Math.ceil((processTimeMs - elapsed) / 1000),
	);
	const secondsElapsed = Math.min(totalSeconds, Math.floor(elapsed / 1000));
	return { percent, secondsLeft, secondsElapsed, totalSeconds };
};

export const getCancellationProgress = (startedAt, now) =>
	getCookingProgress(startedAt, now, CANCELLATION_TIME_MS);
