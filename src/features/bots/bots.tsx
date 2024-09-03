import { Button, Grid, Anchor } from '@mantine/core';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { showNotification } from '@mantine/notifications';
import { IconRobot, IconPlus, IconMinus } from '@tabler/icons-react';
import { Title, Content } from '@core/components/page';
import { useTitle } from '@core/hooks';
import { store } from '@core/store';
import { botAtomsAtom, useAddBot, useRemoveLastBot } from './state';
import { BotCard } from './bot';

export function Bots() {
    useTitle('Bots');

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });
    const { t } = useTranslation(undefined, { keyPrefix: 'bots' });

    const botAtoms = useAtomValue(botAtomsAtom);
    const addBot = useAddBot();
    const removeLastBot = useRemoveLastBot();

    const onAddBot = () => {
        const botAtom = addBot();
        const { name } = store.get(botAtom);

        showNotification({
            title: t('botAdded'),
            message: t('botAddedDesc', { name }),
            color: 'green',
        });
    };
    const onRemoveLastBot = () => {
        const botAtom = removeLastBot();
        const bot = store.get(botAtom);

        showNotification({
            title: bot ? t('botRemoved') : t('noBotsToRemove'),
            message: bot ? t('botRemovedDesc', { name: bot.name }) : '',
            color: 'red',
        });
    };

    return (
        <>
            <Title>
                <IconRobot size={40} />
                <span>{tc('bots')}</span>

                <div className="flex flex-1 justify-end gap-2">
                    <Button color="green" leftSection={<IconPlus size={18} />} onClick={onAddBot}>
                        {tc('add')}
                    </Button>
                    <Button leftSection={<IconMinus size={18} />} onClick={onRemoveLastBot}>
                        {tc('remove')}
                    </Button>
                </div>
            </Title>

            <Content>
                <Grid>
                    {botAtoms.length === 0 && (
                        <Grid.Col
                            span={12}
                            className="py-10 text-center text-lg font-medium text-gray-400"
                        >
                            <span>{t('noBotsYet')}</span>
                            <Anchor
                                className="text-lg font-medium"
                                underline="never"
                                onClick={onAddBot}
                            >
                                {t('addOne')}
                            </Anchor>
                        </Grid.Col>
                    )}
                    {botAtoms.map((botAtom) => (
                        <Grid.Col key={botAtom.toString()} span={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                            <BotCard botAtom={botAtom} />
                        </Grid.Col>
                    ))}
                </Grid>
            </Content>
        </>
    );
}
