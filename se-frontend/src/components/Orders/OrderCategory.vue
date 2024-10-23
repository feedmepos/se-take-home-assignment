<template>
    <div class="order-category">
        <h3>{{ status }}</h3>
        <div style="display: flex; gap: 0.5rem;">
            <OrderTile 
            v-for="order in orders"
                :key="order.id"
                :id="order.id"
                :type="order.type"
                />
        </div>
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
            required: true
        },
        status: {
            type: String,
            required: true
        }
    },
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
}
</style>