import { Paper, Text } from '@mantine/core';
import { LineChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { IconGraph } from '@tabler/icons-react';
import { initializeBotPerformanceInterval, botPerformanceAtom } from './interval';

initializeBotPerformanceInterval();
console.info('Bot performance interval initialized');

type ChartTooltipProps = {
    label: string;
    payload: Record<string, any>[] | undefined;
};

function ChartTooltip({ label, payload }: ChartTooltipProps) {
    const { t } = useTranslation(undefined, { keyPrefix: 'dashboard' });

    if (!payload) return null;

    const getName = (name: string) =>
        name === 'total' ? t('totalBots') : name === 'idle' ? t('idleBots') : t('processingBots');

    return (
        <Paper px="md" py="sm" withBorder shadow="md" radius="md">
            <Text fw={500} mb={5}>
                {new Date(label).toLocaleTimeString()}
            </Text>
            {payload.map((item: any) => (
                <Text key={item.name} fz="sm" className="flex items-center gap-2">
                    <span
                        className="rounded-full"
                        style={{ width: 10, height: 10, background: item.color }}
                    />
                    {getName(item.name)}: {item.value}
                </Text>
            ))}
        </Paper>
    );
}

export function BotChart() {
    const data = useAtomValue(botPerformanceAtom);

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });
    const { t } = useTranslation(undefined, { keyPrefix: 'dashboard' });

    return (
        <Paper shadow="xs" className="p-4">
            <Text className="flex items-center gap-3 pb-4 text-xl font-semibold">
                <IconGraph size={22} />
                <span>{t('botPerformance')}</span>
            </Text>

            <LineChart
                h={400}
                curveType="linear"
                data={data}
                dataKey="timestamp"
                series={[
                    { name: 'total', color: 'red', label: t('totalBots') },
                    { name: 'idle', color: 'gray', label: t('idleBots') },
                    { name: 'processing', color: 'blue', label: t('processingBots') },
                ]}
                withLegend
                tooltipAnimationDuration={100}
                tooltipProps={{
                    content: ({ label, payload }) => (
                        <ChartTooltip label={label} payload={payload} />
                    ),
                }}
                dotProps={{ fill: 'transparent', stroke: 'transparent' }}
                yAxisLabel={tc('bots')}
                yAxisProps={{ allowDecimals: false }}
                xAxisLabel={tc('time')}
                xAxisProps={{
                    type: 'number',
                    domain: [data[0]?.timestamp, data[data.length - 1]?.timestamp],
                    tickFormatter: (value) => new Date(value).toLocaleTimeString(),
                }}
            />
        </Paper>
    );
}
