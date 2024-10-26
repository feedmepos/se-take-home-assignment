<template>
    <div>
        <h1 style="margin: 0.5rem 0 0.5rem 0">Dashboard</h1>
        <div>
            <PendingOrders />
            <WorkingBot />
            <div style="display: flex; gap: 1rem;">
                
            <Customers />
            <IdleBot />
            </div>
        </div>
        
    </div>
</template>

<script>
import Customers from './Customers/Customers.vue';
import PendingOrders from './Dashboard/pendingOrders.vue';
import IdleBot from './Dashboard/IdleBot.vue';
import WorkingBot from './Dashboard/WorkingBot.vue';

export default {
    name: 'HomeDashboard',
    components: {
        Customers,
        PendingOrders,
        IdleBot,
        WorkingBot
    },
}
</script>