import { createRouter, createWebHistory } from "vue-router"; // Use createRouter and createWebHistory

const HomeDashboard = () => import("@/components/HomeDashboard");
const Orders = () => import("@/components/Orders/ListOrders");
const Bots = () => import("@/components/Bots/ListBots");


export const router = createRouter({
    history: createWebHistory(), // Use createWebHistory for history mode
    linkActiveClass: "active",
    scrollBehavior: () => ({ y: 0 }),
    routes: configRoutes(),
});

function configRoutes() {
    return [
        { 
            path: "/",
            redirect: "/dashboard",
            name: "Home",
            children: [
                {
                    path: "dashboard",
                    name: "Dashboard",
                    component: HomeDashboard,
                },
                {
                    path: "orders",
                    name: "Orders",
                    component: Orders,
                },
                {
                    path: "bots",
                    name: "Bots",
                    component: Bots,
                },
            ]
        }
    ];
}

