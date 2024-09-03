import { useAtomValue } from 'jotai';
import { Button, Paper, Grid, Badge, Progress } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { showNotification } from '@mantine/notifications';
import { IconRobot, IconX } from '@tabler/icons-react';
import { store } from '@core/store';
import { type BotAtom, useRemoveBot } from './state';

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

export function BotCard({ botAtom }: { botAtom: BotAtom }) {
    const bot = useAtomValue(botAtom);
    const order = useAtomValue(bot.currentOrder);

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });
    const { t } = useTranslation(undefined, { keyPrefix: 'bots' });

    const removeBot = useRemoveBot();

    const onRemoveBot = () => {
        const removedBotAtom = removeBot(botAtom);
        const { name } = store.get(removedBotAtom);

        showNotification({
            title: t('botRemoved'),
            message: t('botRemovedDesc', { name }),
            color: 'red',
        });
    };

    return (
        <Paper shadow="xs" className="p-4">
            <Grid gutter="xs">
                <Grid.Col span={12} className="flex items-center gap-4 pb-4">
                    <IconRobot size={24} />
                    <span className="text-xl font-semibold">{bot.name}</span>
                    <Badge color="red" className="ml-auto">
                        # {bot.id}
                    </Badge>
                </Grid.Col>

                <Label>{tc('status')}</Label>
                <Value>
                    <Badge color={order ? 'red' : 'gray.5'}>
                        {order ? tc('processing') : tc('idle')}
                    </Badge>
                </Value>

                {order && (
                    <>
                        <Label>{tc('currentOrder')}</Label>
                        <Value>
                            <Badge># {order.id}</Badge>
                        </Value>

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
                <Value>{bot.createdAt.toLocaleString()}</Value>

                <Grid.Col span={12} className="flex justify-end pt-4">
                    <Button size="xs" leftSection={<IconX size={18} />} onClick={onRemoveBot}>
                        {tc('remove')}
                    </Button>
                </Grid.Col>
            </Grid>
        </Paper>
    );
}
