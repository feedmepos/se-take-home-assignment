<template>
    <CButton class="customer-tile" @click="clicked(id)">
        <img :src="source" alt="Customer Type Image" class="customer-image">
        <p class="customer-type">{{ type }}</p>
    </CButton>
</template>

<script>
import { mapActions } from 'vuex';
import Swal from 'sweetalert2';
export default {
    name: "CustomerTile",
    props: {
        id: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    },
    computed: {
        source() {
            // Determine the source based on the customer type
            return this.type === "NORMAL" 
                ? require('@/assets/normal.png') 
                : require('@/assets/vip.png'); // Add other types as necessary
        }
    },
    methods: {
        ...mapActions(['createOrder']),

        async clicked(id){
            const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to add order for ${this.type} customer?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, order!',
            cancelButtonText: 'No, cancel!'
            });
            
            if (result.isConfirmed) {
                await this.createOrder({ customerId: id });
            }
        }
    }
};
</script>

<style>
.customer-tile {
    width: 200px; 
    text-align: center; 
    display: flex; 
    flex-direction: column; 
    justify-content: center; 
    align-items: center; 
    background-color: white; 
    border-radius: 15px; 
    border: 1px solid #ccc; 
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); 
    padding: 1rem;
}

.customer-image {
    width: auto; 
    height: auto; 
    max-width: 100%; 
    border-radius: 10px; 
    object-fit: contain; 
}

.customer-type {
    margin: 10px 0 0 0; 
    font-size: large;
    font-weight: 600;
}
</style>
