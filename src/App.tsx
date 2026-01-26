import { useEffect } from 'react'
import { useStoreQueue } from '@/stores'
import {
	ListCompleted,
	ListPending,
	ListProcessing,
	FormOrder,
} from '@/components'
import { Container, Flex } from '@mantine/core'

function App() {
	const pending = useStoreQueue(state => state.pending)
	const completed = useStoreQueue(state => state.completed)
	const count_robot = useStoreQueue(state => state.count_robot)

	useEffect(useStoreQueue.getState().enqueue_processing, [
		pending,
		completed,
		count_robot,
	])

	return (
		<Container bg="#ffd580" p="xl">
			<Flex justify="space-between" gap="xl">
				<ListPending />
				<FormOrder />
				<ListCompleted />
			</Flex>
			<ListProcessing />
		</Container>
	)
}

export default App
