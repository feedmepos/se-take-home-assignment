import React from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { Modal, Timeline, Text } from '@mantine/core';
import {
    IconHistory,
    IconPlus,
    IconRobot,
    IconActivityHeartbeat,
    IconCheck,
} from '@tabler/icons-react';
import { type OrderAtom, type OrderHistory } from './state';

type OrderHistoryProps = {
    orderAtom: OrderAtom;
} & React.ComponentProps<typeof Modal>;

export function OrderHistory({ orderAtom, ...props }: OrderHistoryProps) {
    const order = useAtomValue(orderAtom);
    const histories = order.history;

    const { t } = useTranslation(undefined, { keyPrefix: 'orders' });

    return (
        <Modal
            title={
                <div className="flex items-center gap-2 pb-2 text-lg font-medium">
                    <IconHistory size={24} />
                    <span>{t('orderHistory')}</span>
                </div>
            }
            {...props}
        >
            <Timeline active={99} bulletSize={22} lineWidth={4} className="py-3">
                {histories.map((history, index) => (
                    <OrderHistoryEntry key={index} history={history} />
                ))}
            </Timeline>
        </Modal>
    );
}

function OrderHistoryEntry({ history }: { history: OrderHistory }) {
    if (history.type === 'CREATED') return <OrderHistoryEntryCreated history={history} />;
    if (history.type === 'ASSIGNED') return <OrderHistoryEntryAssigned history={history} />;
    if (history.type === 'INTERUPPTED') return <OrderHistoryEntryInteruppted history={history} />;
    if (history.type === 'COMPLETED') return <OrderHistoryEntryCompleted history={history} />;
    return null;
}

function OrderHistoryEntryCreated({ history }: { history: OrderHistory }) {
    const { t } = useTranslation(undefined, { keyPrefix: 'orders' });

    return (
        <Timeline.Item
            title={t('orderCreated')}
            bullet={<IconPlus />}
            color="blue"
            __active
            __lineActive
        >
            <Text c="dimmed" size="sm" className="pt-1">
                {t('orderCreatedDesc')}
            </Text>
            <Text size="xs" className="pt-1">
                {history.timestamp.toLocaleString()}
            </Text>
        </Timeline.Item>
    );
}

function OrderHistoryEntryAssigned({ history }: { history: OrderHistory }) {
    const { t } = useTranslation(undefined, { keyPrefix: 'orders' });
    const processor = useAtomValue(history.processor);

    return (
        <Timeline.Item
            title={t('orderAssigned')}
            bullet={<IconRobot />}
            color="blue"
            __active
            __lineActive
        >
            <Text c="dimmed" size="sm" className="pt-1">
                {t('orderAssignedDesc', { bot: processor?.name })}
            </Text>
            <Text size="xs" className="pt-1">
                {history.timestamp.toLocaleString()}
            </Text>
        </Timeline.Item>
    );
}

function OrderHistoryEntryInteruppted({ history }: { history: OrderHistory }) {
    const { t } = useTranslation(undefined, { keyPrefix: 'orders' });
    const processor = useAtomValue(history.processor);

    return (
        <Timeline.Item
            title={t('orderInteruppted')}
            bullet={<IconActivityHeartbeat />}
            color="red"
            __active
            __lineActive
        >
            <Text c="dimmed" size="sm" className="pt-1">
                {t('orderInterupptedDesc', { bot: processor?.name })}
            </Text>
            <Text size="xs" className="pt-1">
                {history.timestamp.toLocaleString()}
            </Text>
        </Timeline.Item>
    );
}

function OrderHistoryEntryCompleted({ history }: { history: OrderHistory }) {
    const { t } = useTranslation(undefined, { keyPrefix: 'orders' });
    const processor = useAtomValue(history.processor);

    return (
        <Timeline.Item
            title={t('orderCompleted')}
            bullet={<IconCheck />}
            color="green"
            __active
            __lineActive
        >
            <Text c="dimmed" size="sm" className="pt-1">
                {t('orderCompletedDesc', { bot: processor?.name })}
            </Text>
            <Text size="xs" className="pt-1">
                {history.timestamp.toLocaleString()}
            </Text>
        </Timeline.Item>
    );
}
