import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { getAnalytics, provideAnalytics } from '@angular/fire/analytics';
import { provideTransloco } from '@jsverse/transloco';
import { provideEnvironmentNgxCurrency } from 'ngx-currency';
import { provideLoadingBarRouter } from '@ngx-loading-bar/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnalytics(() => getAnalytics()),
    provideBrowserGlobalErrorListeners(),
    provideLoadingBarRouter(),
    provideRouter(
      routes, 
      withComponentInputBinding(),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      }),
      withRouterConfig({ onSameUrlNavigation: 'reload' })
    )
  ],
};
