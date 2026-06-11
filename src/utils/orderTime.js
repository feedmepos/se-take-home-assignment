export const formatOrderTime = (timestamp) => {
	return new Date(timestamp).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit',
		hour12: true,
	});
};

export const formatProcessDuration = (durationMs) => {
	const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
	return `${totalSeconds}s`;
};
