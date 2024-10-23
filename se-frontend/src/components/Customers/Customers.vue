<template>
    <div class="customer-category">
        <h3>Customers</h3>
        <div style="display: flex; gap: 1rem;">
            <CustomerTile
                v-for="customer in allCustomers"
                :key="customer.id"
                :id="customer.id"
                :type="customer.role"
            />
        </div>
        
    </div>

</template>

<script>
import CustomerTile from './CustomerTile.vue';
import { mapGetters, mapActions } from 'vuex';

export default {
    name: "CustomerCategory",
    components: {
        CustomerTile
    },
    computed: {
        ...mapGetters(['allCustomers']), 
        loading() {
            return this.$store.getters.isLoading;
        },
  },
    data() {
    },
    created() {
        this.initializeWebSocket();
        this.createSampleCustomers();
    },
    methods: {
        ...mapActions(['initializeWebSocket', 'createCustomer']),

        async createSampleCustomers() {
            await this.createCustomer({ role: 'NORMAL' });
            await this.createCustomer({ role: 'VIP' });
        },
    },
    watch: {
        allCustomers: {
            handler(newCustomers) {
                console.log('Updated customers:', newCustomers); // Log the updated customers whenever they change
            },
            deep: true // Ensure it watches for nested changes
        }
    }
}
</script>

<style>
.customer-category {
    gap: 1rem;
    padding: 20px;
    background-color: rgb(203, 203, 203);
    border-radius: 15px;
    max-width: fit-content;
}
</style>