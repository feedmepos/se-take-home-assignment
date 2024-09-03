import { Paper, Tabs, Button, Grid } from '@mantine/core';
import { IconNote, IconClock, IconCheck, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { showNotification } from '@mantine/notifications';
import { Title, Content } from '@core/components/page';
import { useTitle } from '@core/hooks';
import { store } from '@core/store';
import {
    type OrderAtom,
    vipOrderAtomsAtom,
    regularOrderAtomsAtom,
    completedOrderAtomsAtom,
    useAddRegularOrder,
    useAddVipOrder,
} from './state';
import { OrderCard } from './order';

function EmptyOrder() {
    const { t } = useTranslation(undefined, { keyPrefix: 'orders' });

    return (
        <Grid.Col span={12} className="py-10 text-center text-lg font-medium text-gray-400">
            <span>{t('noOrdersYet')}</span>
        </Grid.Col>
    );
}

function OrderCardCol({ orderAtom }: { orderAtom: OrderAtom }) {
    return (
        <Grid.Col span={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <OrderCard orderAtom={orderAtom} />
        </Grid.Col>
    );
}

export function Orders() {
    useTitle('Orders');

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });
    const { t } = useTranslation(undefined, { keyPrefix: 'orders' });

    const vipOrderAtoms = useAtomValue(vipOrderAtomsAtom);
    const regularOrderAtoms = useAtomValue(regularOrderAtomsAtom);
    const completedOrderAtoms = useAtomValue(completedOrderAtomsAtom);

    const addRegularOrder = useAddRegularOrder();
    const addVipOrder = useAddVipOrder();

    const onAddRegularOrder = () => {
        const orderAtom = addRegularOrder();
        const { id } = store.get(orderAtom);

        showNotification({
            title: t('regularOrderAdded'),
            message: t('regularOrderAddedDesc', { id }),
            color: 'green',
        });
    };
    const onAddVipOrder = () => {
        const orderAtom = addVipOrder();
        const { id } = store.get(orderAtom);

        showNotification({
            title: t('vipOrderAdded'),
            message: t('vipOrderAddedDesc', { id }),
            color: 'green',
        });
    };

    return (
        <>
            <Title>
                <IconNote size={40} />
                <span>{tc('orders')}</span>

                <div className="flex flex-1 justify-end gap-2">
                    <Button leftSection={<IconPlus size={18} />} onClick={onAddVipOrder}>
                        {t('vipOrder')}
                    </Button>
                    <Button
                        color="blue"
                        leftSection={<IconPlus size={18} />}
                        onClick={onAddRegularOrder}
                    >
                        {t('regularOrder')}
                    </Button>
                </div>
            </Title>
            <Content>
                <Tabs defaultValue="ongoing">
                    <Paper shadow="xs" className="mb-4">
                        <Tabs.List>
                            <Tabs.Tab
                                className="p-4"
                                value="ongoing"
                                leftSection={<IconClock size={18} />}
                            >
                                {t('ongoingOrder')}
                            </Tabs.Tab>
                            <Tabs.Tab
                                className="p-4"
                                value="completed"
                                leftSection={<IconCheck size={18} />}
                            >
                                {t('completedOrder')}
                            </Tabs.Tab>
                        </Tabs.List>
                    </Paper>

                    <Tabs.Panel value="ongoing">
                        <Grid>
                            {vipOrderAtoms.length === 0 && regularOrderAtoms.length === 0 && (
                                <EmptyOrder />
                            )}
                            {vipOrderAtoms.map((orderAtom) => (
                                <OrderCardCol orderAtom={orderAtom} key={orderAtom.toString()} />
                            ))}
                            {regularOrderAtoms.map((orderAtom) => (
                                <OrderCardCol orderAtom={orderAtom} key={orderAtom.toString()} />
                            ))}
                        </Grid>
                    </Tabs.Panel>
                    <Tabs.Panel value="completed">
                        <Grid>
                            {completedOrderAtoms.length === 0 && <EmptyOrder />}
                            {completedOrderAtoms.map((orderAtom) => (
                                <OrderCardCol orderAtom={orderAtom} key={orderAtom.toString()} />
                            ))}
                        </Grid>
                    </Tabs.Panel>
                </Tabs>
            </Content>
        </>
    );
}
