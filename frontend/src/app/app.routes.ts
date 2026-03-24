import { Routes } from '@angular/router';
import { Error404Component } from './modules/error/pages/error-404/error-404.component';
import { Error500Component } from './modules/error/pages/error-500/error-500.component';

const errorRoutes: Routes = [
    { path: '', redirectTo: '404', pathMatch: 'full' },
    { path: '404', component: Error404Component },
    { path: '500', component: Error500Component },
    { path: '**', redirectTo: 'error/404' },
];

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./modules/home/home.component').then(m => m.HomeComponent)
    },
    { path: 'errors', children: errorRoutes },
    { path: '**', redirectTo: 'errors/404' },
];
