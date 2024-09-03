import { useAtomValue, atom } from 'jotai';
import { Paper, Text, Divider, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconNote } from '@tabler/icons-react';
import { regularOrderAtomsAtom, vipOrderAtomsAtom, completedOrderAtomsAtom } from '@feat/orders';

const orderCountAtom = atom((get) => {
    const regularOrderAtoms = get(regularOrderAtomsAtom);
    const vipOrderAtoms = get(vipOrderAtomsAtom);
    const completedOrderAtoms = get(completedOrderAtomsAtom);

    const result = { regular: 0, vip: 0, pending: 0, processing: 0, completed: 0 };

    [...regularOrderAtoms, ...vipOrderAtoms, ...completedOrderAtoms].forEach((orderAtom) => {
        const order = get(orderAtom);
        result.regular += order.type === 'NORMAL' ? 1 : 0;
        result.vip += order.type === 'VIP' ? 1 : 0;
        result.pending += order.status === 'PENDING' ? 1 : 0;
        result.processing += order.status === 'PROCESSING' ? 1 : 0;
        result.completed += order.status === 'COMPLETED' ? 1 : 0;
    });

    return result;
});

export function OrderOverview() {
    const count = useAtomValue(orderCountAtom);

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });

    return (
        <Paper shadow="xs" className="p-4">
            <Text className="flex items-center gap-3 pb-4 text-xl font-semibold">
                <IconNote size={22} />
                <span>{tc('orders')}</span>
            </Text>

            {/* Regular / VIP count */}
            <div className="flex justify-center gap-8 py-4">
                <div className="flex flex-col items-center gap-1">
                    <Text className="text-2xl font-bold" c="blue">
                        {count.regular}
                    </Text>
                    <Badge size="sm" color="blue">
                        {tc('regular')}
                    </Badge>
                </div>
                <Divider orientation="vertical" />
                <div className="flex flex-col items-center gap-1">
                    <Text className="text-2xl font-bold" c="red">
                        {count.vip}
                    </Text>
                    <Badge size="sm" color="red">
                        {tc('vip')}
                    </Badge>
                </div>
            </div>

            <Divider />

            {/* Pending / Processing / Completed count */}
            <div className="flex justify-center gap-6 py-4">
                <div className="flex flex-col items-center">
                    <Text size="sm" className="text-center font-semibold" c="gray">
                        {count.pending}
                        <Badge className="mt-1 block" size="xs" color="gray">
                            {tc('pending')}
                        </Badge>
                    </Text>
                </div>
                <Divider orientation="vertical" />
                <div className="flex flex-col items-center">
                    <Text size="sm" className="text-center font-semibold" c="blue">
                        {count.processing}
                        <Badge className="mt-1 block" size="xs" color="blue">
                            {tc('processing')}
                        </Badge>
                    </Text>
                </div>
                <Divider orientation="vertical" />
                <div className="flex flex-col items-center">
                    <Text size="sm" className="text-center font-semibold" c="green">
                        {count.completed}
                        <Badge className="mt-1 block" size="xs" color="green">
                            {tc('completed')}
                        </Badge>
                    </Text>
                </div>
            </div>
        </Paper>
    );
}
