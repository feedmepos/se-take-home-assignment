import { SystemState, GetStateResponse } from '../types';

const API_BASE = '/api';

export const stateApi = {
  getState: async (): Promise<SystemState> => {
    const response = await fetch(`${API_BASE}/state`);
    if (!response.ok) throw new Error('Failed to fetch state');
    const data: GetStateResponse = await response.json();
    return {
      orders: data.orders,
      bots: data.bots,
    };
  },

  reset: async (): Promise<void> => {
    const response = await fetch(`${API_BASE}/reset`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to reset system');
  },
};
