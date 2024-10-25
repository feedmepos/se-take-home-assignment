<template>
    <div class="order-category" style="margin-bottom: 4rem;">
        <h2>Pending Orders</h2>
        <p v-if="loading">Loading orders...</p>
        <div v-else-if="pendingOrders.length > 0" class="order-scroll">
            <OrderTile v-for="order in pendingOrders"
                :key="order.id"
                :id="order.id"
                :type="order.type"
                />
        </div>
        <div v-else>No pending orders</div>
    </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import OrderTile from '../Orders/OrderTile.vue';
export default {
    name: "ListOrders",
    props: {
        status: {
            type: String,
            required: true
        }
    },
    components: {
        OrderTile
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

<style>
.order-category {
    padding: 20px;
    border-radius: 15px;
    width: 100%;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    background-color: #DA291C;
    color: white; /* Set font color to white */

}

.order-scroll {
    display: flex; /* Align children in a row */
    overflow-x: auto; /* Enable horizontal scrolling */
    padding-bottom: 10px; /* Optional padding for better aesthetics */
    gap: 1rem; /* Space between tiles */
    scrollbar-width: none; 
    align-items: center;

}
</style>