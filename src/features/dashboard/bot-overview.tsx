import { useAtomValue, atom } from 'jotai';
import { Paper, Text, Divider, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconRobot } from '@tabler/icons-react';
import { botAtomsAtom } from '@feat/bots';

const botCountAtom = atom((get) => {
    const botAtoms = get(botAtomsAtom);

    const result = { count: botAtoms.length, idle: 0, processing: 0 };

    botAtoms.forEach((orderAtom) => {
        const bot = get(orderAtom);
        const order = get(bot.currentOrder);
        result.idle += order ? 0 : 1;
        result.processing += order ? 1 : 0;
    });

    return result;
});

export function BotOverview() {
    const count = useAtomValue(botCountAtom);

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });

    return (
        <Paper shadow="xs" className="p-4">
            <Text className="flex items-center gap-3 pb-4 text-xl font-semibold">
                <IconRobot size={22} />
                <span>{tc('bots')}</span>
            </Text>

            {/* Idle / Processing count */}
            <div className="flex items-center justify-center gap-6 py-8">
                <div className="flex flex-col items-center gap-2 py-4">
                    <Text className="text-2xl font-bold" c="gray">
                        {count.idle}
                    </Text>
                    <Badge size="md" color="gray">
                        {tc('idle')}
                    </Badge>
                </div>
                <Divider orientation="vertical" />
                <div className="flex flex-col items-center gap-2 py-4">
                    <Text className="text-2xl font-bold" c="red">
                        {count.count}
                    </Text>
                    <Badge size="md">{tc('total')}</Badge>
                </div>
                <Divider orientation="vertical" />
                <div className="flex flex-col items-center gap-2 py-4">
                    <Text className="text-2xl font-bold" c="blue">
                        {count.processing}
                    </Text>
                    <Badge size="md" color="blue">
                        {tc('processing')}
                    </Badge>
                </div>
            </div>
        </Paper>
    );
}
