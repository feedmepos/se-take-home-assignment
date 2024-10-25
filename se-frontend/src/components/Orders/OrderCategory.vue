<template>
    <div class="order-category">
        <h3>{{ status }}</h3>
        <div v-if="orders.length > 0" class="order-scroll">
            <OrderTile 
            v-for="order in orders"
                :key="order.id"
                :id="order.id"
                :type="order.type"
                />
        </div>
        <div v-else>No {{ status.toLowerCase() }} Orders</div>
    </div>
</template>

<script>
import OrderTile from './OrderTile.vue';


export default {
    name: "OrderCategory",
    components: {
        OrderTile
    },
    props: {
        orders: {
            type: Array,
            default: () => []
        },
        status: {
            type: String,
            required: true
        }
    }
}
</script>

<style>
.order-category {
    gap: 1rem;
    padding: 20px;
    background-color: rgb(203, 203, 203);
    border-radius: 15px;
    width: 1250px;
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
    max-height: 550px;
    align-items: center;
   
}
.order-scroll {
    overflow-x: auto;
    scrollbar-width: none; 
}
</style>