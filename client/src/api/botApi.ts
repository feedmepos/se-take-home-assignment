import { Bot, CreateBotResponse, RemoveBotResponse } from '../types';

const API_BASE = '/api';

export const botApi = {
  createBot: async (): Promise<Bot> => {
    const response = await fetch(`${API_BASE}/bots`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to create bot');
    const data: CreateBotResponse = await response.json();
    return data.bot;
  },

  removeBot: async (): Promise<Bot | null> => {
    const response = await fetch(`${API_BASE}/bots`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      if (response.status === 400) return null;
      throw new Error('Failed to remove bot');
    }
    const data: RemoveBotResponse = await response.json();
    return data.bot;
  },
};
