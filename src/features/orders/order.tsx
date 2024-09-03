import { useAtomValue } from 'jotai';
import { Paper, Grid, Badge, Button, Progress } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useDisclosure } from '@mantine/hooks';
import { IconNote, IconHistory } from '@tabler/icons-react';
import { type OrderAtom } from './state';
import { OrderHistory } from './history';

function Label({ children, ...props }: React.ComponentProps<typeof Grid.Col>) {
    return (
        <Grid.Col span={4} className="text-sm font-medium text-gray-400" {...props}>
            {children}
        </Grid.Col>
    );
}
function Value({ children, ...props }: React.ComponentProps<typeof Grid.Col>) {
    return (
        <Grid.Col span={8} className="flex items-center text-sm" {...props}>
            {children}
        </Grid.Col>
    );
}

export function OrderCard({ orderAtom }: { orderAtom: OrderAtom }) {
    const [isHistoryModalOpen, { open, close }] = useDisclosure();

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });

    const order = useAtomValue(orderAtom);
    const processor = useAtomValue(order.processor);

    const typeColor = order.type === 'VIP' ? 'red' : 'blue';
    const statusColor =
        order.status === 'PENDING' ? 'gray' : order.status === 'PROCESSING' ? 'blue' : 'green';
    const orderType = order.type === 'VIP' ? tc('vip') : tc('regular');
    const orderStatus =
        order.status === 'PENDING'
            ? tc('pending')
            : order.status === 'PROCESSING'
              ? tc('processing')
              : tc('completed');

    return (
        <Paper shadow="xs" className="p-4">
            <Grid gutter="xs">
                <Grid.Col span={12} className="flex items-center gap-4 pb-4">
                    <IconNote size={24} />
                    <span className="text-xl font-semibold">
                        {tc('order')} # {order.id}
                    </span>
                    <Badge color={typeColor} className="ml-auto">
                        {orderType}
                    </Badge>
                </Grid.Col>

                <Label>{tc('status')}</Label>
                <Value>
                    <Badge color={statusColor}>{orderStatus}</Badge>
                </Value>

                {processor && (
                    <>
                        <Label>{tc('bot')}</Label>
                        <Value>{processor.name}</Value>
                    </>
                )}

                {order.status === 'PROCESSING' && (
                    <>
                        <Label>{tc('progress')}</Label>
                        <Value>
                            <Progress
                                className="w-full"
                                value={(order.progress / order.duration) * 100}
                            />
                        </Value>
                    </>
                )}

                <Label>{tc('created')}</Label>
                <Value>{order.createdAt.toLocaleString()}</Value>

                {order.completedAt && (
                    <>
                        <Label>{tc('completed')}</Label>
                        <Value>{order.completedAt.toLocaleString()}</Value>
                    </>
                )}

                <Grid.Col span={12} className="flex justify-end pt-4">
                    <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconHistory size={18} />}
                        onClick={open}
                    >
                        {tc('history')}
                    </Button>
                </Grid.Col>
            </Grid>

            <OrderHistory orderAtom={orderAtom} opened={isHistoryModalOpen} onClose={close} />
        </Paper>
    );
}
