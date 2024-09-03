import { createTheme, MantineProvider as MP } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

type MantineProviderProps = React.ComponentProps<typeof MP>;

const theme = createTheme({
    primaryColor: 'red',
    fontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
});

export function MantineProvider({ children, ...rest }: MantineProviderProps) {
    return (
        <MP theme={theme} defaultColorScheme="auto" {...rest}>
            <Notifications />
            {children}
        </MP>
    );
}
