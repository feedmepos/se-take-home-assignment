<template>
    <div>
        <h1>Dashboard</h1>
        <Customers />
    </div>
</template>

<script>
import Customers from './Customers/Customers.vue';

export default {
    name: 'HomeDashboard',
    components: {
        Customers
    },
}
</script>