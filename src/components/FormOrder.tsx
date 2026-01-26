import { useStoreQueue } from '@/stores'
import { NumberInput, Paper, Button, Flex, Text } from '@mantine/core'
import { useState } from 'react'

export const FormOrder = () => {
	const number_initial = useStoreQueue((state) => state.count_robot)
	const [number, setNumber] = useState(number_initial)
	return (
		<Paper
			px="md"
			style={{ flexGrow: 1, flexDirection: 'column' }}
			display="flex"
		>
			<Text ta="center" tt="uppercase" td="underline" fz="lg" fw={700} w="100%">
				settings
			</Text>
			<NumberInput
				label="Number of Robots (1-100)"
				value={number}
				onChange={(v) => setNumber(Number(v))}
				min={1}
				max={100}
				allowDecimal={false}
			/>
			<Button
				mt="xs"
				bg="orange"
				w="fit-content"
				onClick={() => {
					useStoreQueue.getState().modify_robot_count(number)
				}}
			>
				Update
			</Button>
			<Flex
				w="100%"
				align="center"
				style={{ flexGrow: 1 }}
				justify="space-evenly"
			>
				<Button
					w="8rem"
					onClick={() => {
						useStoreQueue.getState().enqueue_pending('regular')
					}}
				>
					Regular Order
				</Button>
				<Button
					w="8rem"
					bg="green"
					onClick={() => {
						useStoreQueue.getState().enqueue_pending('vip')
					}}
				>
					Vip Order
				</Button>
			</Flex>
		</Paper>
	)
}
