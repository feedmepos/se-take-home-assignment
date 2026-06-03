export const formatOrderTime = (timestamp) => {
	return new Date(timestamp).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit',
		hour12: true,
	});
};
