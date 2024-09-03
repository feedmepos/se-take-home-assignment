import { Provider } from 'jotai';
import { store } from '@core/store';

export function JotaiStoreProvider({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
}
