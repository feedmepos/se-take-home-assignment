import { useEffect } from 'react';

export function useTitle(title: string, full: boolean | undefined = false) {
    const template = import.meta.env.VITE_TITLE_TEMPLATE;
    title = full ? title : template.replace('{}', title);

    useEffect(() => {
        document.title = title;
    }, [title]);
}
