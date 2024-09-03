import { ActionIcon } from '@mantine/core';
import { IconMenu2 } from '@tabler/icons-react';
import { useIsLocked } from '@core/components/drawer';

export function Drawer() {
    const [_, setIsLocked] = useIsLocked();

    return (
        <ActionIcon variant="subtle" size="lg" onClick={() => setIsLocked((locked) => !locked)}>
            <IconMenu2 size={20} />
        </ActionIcon>
    );
}
