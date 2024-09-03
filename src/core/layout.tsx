import { TransitionOutlet } from '@core/components/outlet';
import { MantineProvider, JotaiStoreProvider, I18nProvider } from '@core/components/providers';
import { DrawerLayout } from '@core/components/drawer';
import { Navbar } from '@core/components/navbar';
import { Footer } from '@core/components/footer';

export function Layout() {
    return (
        <MantineProvider>
            <JotaiStoreProvider>
                <I18nProvider>
                    <DrawerLayout>
                        <div className="flex min-h-screen flex-col gap-4 p-4">
                            <Navbar />
                            <TransitionOutlet />
                        </div>
                        <Footer />
                    </DrawerLayout>
                </I18nProvider>
            </JotaiStoreProvider>
        </MantineProvider>
    );
}
