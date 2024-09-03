import { atom } from 'jotai';
import { useAtom, useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

const isHover = atom(false);
const isLocked = atomWithStorage('drawer-locked', false);
const isExpand = atom((get) => get(isHover) || get(isLocked));

export const useIsHover = () => useAtom(isHover);
export const useIsLocked = () => useAtom(isLocked);
export const useIsExpand = () => useAtomValue(isExpand);

export const useIsMobile = () => {
    const { breakpoints } = useMantineTheme();
    const mobile = breakpoints.sm;
    return useMediaQuery(`(max-width: ${mobile})`);
};
