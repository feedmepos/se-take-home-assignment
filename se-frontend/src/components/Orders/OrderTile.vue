<template>
    <div class="order-tile">
        <p class="order-id">Order {{ id }}</p>
        <p class="order-type">Type: {{ type }}</p>
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
    width: auto; 
    height: auto; 
    max-width: 100%; 
    object-fit: contain; 
}

.order-id {
    font-weight: 600;
    font-size: large;
    margin: 10px 0 -1px 0;
}

.order-type {
    margin-top: 5px;
}

</style>
