import { writable } from 'svelte/store';
import type { AppState } from '$lib/types';

export const state = writable<AppState>({
	pending_orders: [],
	completed_orders: [],
	bots: []
});
