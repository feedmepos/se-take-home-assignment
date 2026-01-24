import { creator } from './__creator'

export const useStoreQueue = creator<{
	id_order_latest: number
	count_robot: number
	pending: Record<'regular' | 'vip', { id_order: number; time_create: Date }[]>
	processing: Record<
		number,
		{
			id_order: number
			id_process: number
			time_process: Date
			time_create: Date
			type: 'regular' | 'vip'
			status: 'pause' | 'processing'
			time_remaining: number
		}
	>
	completed: {
		id_order: number
		time_process: Date
		time_complete: Date
		time_create: Date
		type: 'regular' | 'vip'
		id_robot: number
	}[]
	modifyRoboCount: (count: number) => void
	enqueue_pending: (type: 'regular' | 'vip') => void
	enqueue_processing: () => void
}>((set, get) => {
	return {
		id_order_latest: 0,
		count_robot: 1,
		pending: { regular: [], vip: [] },
		processing: {},
		completed: [],
		enqueue_pending: (type) => {
			set((state) => {
				const newId = state.id_order_latest + 1
				state.id_order_latest = newId
				state.pending[type].push({ id_order: newId, time_create: new Date() })
			})
		},
		enqueue_processing: () => {
			const processing = get().processing
			if (Object.keys(processing).length >= get().count_robot) return
			if (!get().pending.vip[0] && !get().pending.regular[0]) return
			const id_robot =
				[...Array(get().count_robot)].findIndex((_, index) => {
					return !processing[index + 1]
				}) + 1

			const time_remaining = 1e4
			const id_process = setTimeout(() => {
				set((state) => {
					state.completed.unshift({
						...state.processing[id_robot],
						time_complete: new Date(),
						id_robot,
					})
					delete state.processing[id_robot]
				})
			}, time_remaining)

			set((state) => {
				const type = state.pending.vip[0] ? 'vip' : 'regular'
				state.processing[id_robot] = {
					...state.pending[type][0],
					time_process: new Date(),
					status: 'processing',
					time_remaining,
					type,
					id_process,
				}
				state.pending[type].shift()
			})
		},
		modifyRoboCount: (count) => {
			set((state) => {
				state.count_robot = count
			})
			Object.entries(get().processing).forEach(
				([id_robot, { type, id_order, id_process }]) => {
					const numericRobotId = Number(id_robot)
					if (numericRobotId > count) {
						clearTimeout(id_process)
						set((state) => {
							state.pending[type].push({ id_order, time_create: new Date() })
							delete state.processing[numericRobotId]
						})
					}
				},
			)
		},
	}
})
