import { Paper, Table, Anchor } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Title, Content } from '@core/components/page';
import { useTitle } from '@core/hooks';

export function About() {
    useTitle('About');

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });
    const { t } = useTranslation(undefined, { keyPrefix: 'about' });

    return (
        <>
            <Title>
                <IconHelp size={40} />
                <span>{tc('about')}</span>
            </Title>
            <Content>
                <Paper shadow="xs" className="p-4">
                    <p>{t('c1')} 😁</p>
                    <p className="pt-6">{t('c2')}</p>

                    <Table className="mt-5">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{tc('technology')}</Table.Th>
                                <Table.Th>{tc('type')}</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://reactjs.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        React
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('framework')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://www.typescriptlang.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        TypeScript
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('language')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://jotai.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Jotai
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('stateManagement')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://mantine.dev/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Mantine
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('uiLibrary')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://tailwindcss.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Tailwind CSS
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('styling')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://framer.com/motion"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Framer Motion
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('animations')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://tanstack.com/router/latest/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        TanStack Router
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('routing')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://eslint.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        ESLint
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('linting')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://prettier.io/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Prettier
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('formatting')}</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>
                                    <Anchor
                                        href="https://www.i18next.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        i18next
                                    </Anchor>
                                </Table.Td>
                                <Table.Td>{tc('internationalization')}</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Paper>
            </Content>
        </>
    );
}
