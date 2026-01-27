import { useStoreQueue } from '@/stores'
import { ScrollArea, Paper, Text, Stack } from '@mantine/core'

export const ListPending = () => {
	const pending = useStoreQueue(state => state.pending)

	return (
		<Paper display="flex">
			{(['regular', 'vip'] as const).map(type => {
				return (
					<Stack key={type} align="center">
						<Text ta="center" tt="uppercase" td="underline" fz="lg" fw={700}>
							{type}
						</Text>
						<ScrollArea h={400} w={160}>
							{pending[type].map(({ id_order }) => {
								return (
									<Text key={id_order} ta="center">
										{id_order.toString().padStart(4, '0')}
									</Text>
								)
							})}
						</ScrollArea>
					</Stack>
				)
			})}
		</Paper>
	)
}
