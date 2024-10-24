<template>
    <div class="order-tile">
        <p>Order {{ id }}</p>
        <p>Type: {{ type }}</p>
    </div>
</template>

<script>
export default {
    name: "OrderTile",
    props: {
        id: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    }
};
</script>

<style>
.order-tile {
    min-width: 200px;
    max-width: 200px;
    text-align: center; 
    display: flex; /* Use flexbox for layout */
    flex-direction: column; /* Stack children vertically */
    justify-content: center; /* Center children vertically */
    align-items: center; /* Center children horizontally */
    background-color: white; /* Background color */
    border-radius: 15px; /* Smooth rounded corners */
    border: 1px solid #ccc; /* Optional border color */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Optional shadow for depth */
    padding: 1rem;
}

.order-image {
    width: auto; /* Set a fixed width for the image */
    height: auto; /* Maintain aspect ratio */
    max-width: 100%; /* Ensure the image does not exceed the tile's width */
    border-radius: 10px; /* Optional: round the image corners */
    object-fit: contain; /* Ensures the image is contained within its box */
}

.order-type {
    margin: 0; /* Remove default margin from the paragraph */
}
</style>
