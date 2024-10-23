<template>
    <div>
        <h1>Orders</h1>
        <p v-if="loading">Loading orders...</p>
        <div v-else-if="allOrders && allOrders.length">
            <OrderCategory :orders="pendingOrders" status="PENDING" />
            <OrderCategory :orders="processingOrders" status="PROCESSING" />
            <OrderCategory :orders="completedOrders" status="COMPLETED" />
        </div>
        <div v-else>
            No orders available.
        </div>
    </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import OrderCategory from './OrderCategory.vue';
export default {
    name: "ListOrders",
    props: {
        status: {
            type: String,
            required: true
        }
    },
    components: {
        OrderCategory
    },
    computed: {
        ...mapGetters(['allOrders']), 
        loading() {
            return this.$store.getters.isLoading;
        },
        pendingOrders() {
            return Array.isArray(this.allOrders) 
            ? this.allOrders.filter(order => order.status === 'PENDING') 
            : [];
        },
        processingOrders() {
            return Array.isArray(this.allOrders) 
            ? this.allOrders.filter(order => order.status === 'PROCESSING') 
            : [];
        },
        completedOrders() {
            return Array.isArray(this.allOrders) 
            ? this.allOrders.filter(order => order.status === 'COMPLETED') 
            : [];
        }
    },
    created() {
        this.initializeWebSocket();
        this.fetchOrders();
    },
    methods: {
        ...mapActions(['initializeWebSocket', 'getAllOrders']),
        fetchOrders() {
            this.getAllOrders();
        },
    },
}
</script>