<template>
    <div class="order-category" style="margin-bottom: 4rem;">
        <h2>Pending Orders</h2>
        <p v-if="loading">Loading orders...</p>
        <div v-else style="display: flex; gap: 1rem;">
            <OrderTile v-for="order in pendingOrders"
                :key="order.id"
                :id="order.id"
                :type="order.type"
                />
        </div>
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
    gap: 1rem;
    padding: 20px;
    background-color: rgb(203, 203, 203);
    border-radius: 15px;
    width: 100%;
}
</style>