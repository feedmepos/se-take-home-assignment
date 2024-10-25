<template>
    <div>
        <h1 style="margin: 1rem 0 2rem 0">Orders</h1>
        <p v-if="loading">Loading orders...</p>
        <div v-else style="display: flex; gap: 1rem;">
            <OrderCategory :orders="pendingOrders" status="PENDING" style="background-color: #DA291C; color: white"/>
            <OrderCategory :orders="processingOrders" status="PROCESSING" style="background-color: #DA291C; color: white"/>
            <OrderCategory :orders="completedOrders" status="COMPLETED" style="background-color: #DA291C; color: white"/>
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
            : null;
        },
        processingOrders() {
            return Array.isArray(this.allOrders) 
            ? this.allOrders.filter(order => order.status === 'PROCESSING') 
            : null;
        },
        completedOrders() {
            return Array.isArray(this.allOrders) 
            ? this.allOrders.filter(order => order.status === 'COMPLETED') 
            : null;
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
