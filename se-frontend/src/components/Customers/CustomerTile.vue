<template>
    <div class="customer-tile">
        <img :src="source" alt="Customer Type Image" class="customer-image">
        <p class="customer-type">{{ type }}</p>
    </div>
</template>

<script>
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
    }
};
</script>

<style>
.customer-tile {
    width: 200px; /* Full width of the container */
    text-align: center; 
    display: flex; /* Use flexbox for layout */
    flex-direction: column; /* Stack children vertically */
    justify-content: center; /* Center children vertically */
    align-items: center; /* Center children horizontally */
    background-color: white; /* Background color */
    border-radius: 15px; /* Increase for smoother rounded corners */
    border: 1px solid #ccc; /* Optional border color */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Optional shadow for depth */
    padding: 1rem;
}

.customer-image {
    width: auto; /* Set a fixed width for the image */
    height: auto; /* Maintain aspect ratio */
    max-width: 100%; /* Ensure the image does not exceed the tile's width */
    border-radius: 10px; /* Optional: round the image corners */
    object-fit: contain; /* Ensures the image is contained within its box */
}

.customer-type {
    margin: 0; /* Remove default margin from the paragraph */
}
</style>
