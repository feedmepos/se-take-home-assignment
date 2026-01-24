import { del, get, set } from 'idb-keyval'
import { mergeDeepLeft } from 'ramda'
import { type StateCreator, create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// https://stackoverflow.com/questions/75600187/error-with-zustand-and-typescript-when-using-persist-the-error-is-persist-d-ts
export const creator = <T extends { [s: string]: unknown }>(
	initializer: StateCreator<
		T,
		[['zustand/persist', unknown], ['zustand/immer', never]]
	>,
	{
		// change this value to reset indexed db
		version = 1,
		name,
		keysToPersist = [],
	}: {
		version?: number
		name: string
		keysToPersist?: readonly (keyof T)[]
	},
) =>
	create<T>()(
		devtools(
			persist(
				immer((set, get, store) => ({
					...initializer(set, get, store),
				})),
				{
					version,
					name,
					migrate: (persistedState, ver) => {
						if (ver !== version) {
							return {} as T
						}
						return persistedState as T
					},
					partialize: (state) =>
						Object.fromEntries(
							Object.entries(state).filter(([key]) =>
								keysToPersist.includes(key),
							),
						),
					// https://blog.muvon.io/frontend/starting-with-zustand
					storage: createJSONStorage(() => ({
						getItem: async (name: string) => {
							return (await get(name)) || null
						},
						setItem: (name: string, value: string) => {
							return set(name, value)
						},
						removeItem: (name: string) => {
							return del(name)
						},
					})),
					merge: (persistedState, currentState) =>
						// https://github.com/pmndrs/zustand/discussions/1143
						mergeDeepLeft(persistedState as T, currentState) as unknown as T,
				},
			),
		),
	)
