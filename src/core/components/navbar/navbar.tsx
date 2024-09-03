import { Paper } from '@mantine/core';
import { Drawer } from './drawer';
import { Mode } from './mode';
import { Locale } from './locale';

export function Navbar() {
    return (
        <Paper
            component="nav"
            shadow="xs"
            radius="md"
            color="primary"
            className="flex gap-1 px-4 py-3"
        >
            <Drawer />
            <Mode />
            <Locale />
        </Paper>
    );
}
