<template>
    <div>
        <h1 style="margin-bottom: 4rem">Dashboard</h1>
        <div>
            <PendingOrders />
            <Customers />
        </div>
        
    </div>
</template>

<script>
import Customers from './Customers/Customers.vue';
import PendingOrders from './Dashboard/pendingOrders.vue';

export default {
    name: 'HomeDashboard',
    components: {
        Customers,
        PendingOrders
    },
}
</script>