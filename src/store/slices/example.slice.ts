import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface ExampleState {
  loading: boolean;
  error: string | null;
  value: string;
}

const initialState: ExampleState = {
  loading: false,
  error: null,
  value: "",
};

export const fetchExample = createAsyncThunk("example/fetch", async () => {
  return Promise.resolve("hello from thunk");
});

const slice = createSlice({
  name: "example",
  initialState,
  reducers: {
    setValue(state, action: PayloadAction<string>) {
      state.value = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExample.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchExample.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          state.value = action.payload;
        },
      )
      .addCase(fetchExample.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export const { setValue } = slice.actions;
export default slice.reducer;
