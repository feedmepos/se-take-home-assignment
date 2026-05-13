import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Bot } from '../../types';

interface BotState {
  items: Bot[];
  loading: boolean;
  error: string | null;
}

const initialState: BotState = {
  items: [],
  loading: false,
  error: null,
};

export const botSlice = createSlice({
  name: 'bots',
  initialState,
  reducers: {
    setBots: (state, action: PayloadAction<Bot[]>) => {
      state.items = action.payload;
      state.error = null;
    },
    addBot: (state, action: PayloadAction<Bot>) => {
      state.items.push(action.payload);
      state.error = null;
    },
    removeBot: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((b) => b.id !== action.payload);
    },
    updateBot: (state, action: PayloadAction<Bot>) => {
      const index = state.items.findIndex((b) => b.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearBots: (state) => {
      state.items = [];
      state.error = null;
    },
  },
});

export const {
  setBots,
  addBot,
  removeBot,
  updateBot,
  setLoading,
  setError,
  clearBots,
} = botSlice.actions;

export default botSlice.reducer;
