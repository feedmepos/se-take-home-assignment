import { state } from '$lib/stores/orders';
import type { WSEvent } from '$lib/types';

let ws: WebSocket | null = null;

export function connect() {
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

	ws.onmessage = (event) => {
		const data: WSEvent = JSON.parse(event.data);
		if (data.type === 'state_sync') {
			state.set(data.payload);
		}
	};

	ws.onclose = () => {
		ws = null;
		setTimeout(connect, 1000);
	};

	ws.onerror = () => {
		ws?.close();
	};
}

export async function addOrder(type: 'normal' | 'vip') {
	await fetch('/api/orders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ type })
	});
}

export async function addBot() {
	await fetch('/api/bots', { method: 'POST' });
}

export async function removeBot() {
	await fetch('/api/bots', { method: 'DELETE' });
}
