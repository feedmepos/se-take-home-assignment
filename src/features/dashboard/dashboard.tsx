import { Grid } from '@mantine/core';
import { IconHome } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Title, Content } from '@core/components/page';
import { useTitle } from '@core/hooks';
import { OrderOverview } from './order-overview';
import { BotOverview } from './bot-overview';
import { OrderChart } from './order-chart';
import { BotChart } from './bot-chart';

export function Dashboard() {
    useTitle('Dashboard');

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });

    return (
        <>
            <Title>
                <IconHome size={40} />
                <span>{tc('dashboard')}</span>
            </Title>
            <Content>
                <Grid>
                    <Grid.Col span={{ xs: 12, md: 6 }}>
                        <OrderOverview />
                    </Grid.Col>
                    <Grid.Col span={{ xs: 12, md: 6 }}>
                        <BotOverview />
                    </Grid.Col>
                    <Grid.Col span={12}>
                        <OrderChart />
                    </Grid.Col>
                    <Grid.Col span={12}>
                        <BotChart />
                    </Grid.Col>
                </Grid>
            </Content>
        </>
    );
}
