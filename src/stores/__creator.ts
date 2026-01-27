import { type StateCreator, create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// https://stackoverflow.com/questions/75600187/error-with-zustand-and-typescript-when-using-persist-the-error-is-persist-d-ts
export const creator = <T extends { [s: string]: unknown }>(
	initializer: StateCreator<T, [['zustand/immer', never]]>,
) => create<T>()(immer(initializer))
