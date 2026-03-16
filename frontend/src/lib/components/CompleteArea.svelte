<script lang="ts">
	import type { Order } from '$lib/types';
	import OrderCard from './OrderCard.svelte';

	let { orders = [] }: { orders: Order[] } = $props();
</script>

<div class="rounded-xl border border-[#4a4843] bg-[#2f2d28] p-4">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-xl font-bold text-green-400">COMPLETE</h2>
		<span class="rounded-full bg-[#4a4843] px-2 py-0.5 text-sm text-gray-300"
			>{orders.length}</span
		>
	</div>
	{#if orders.length === 0}
		<p class="text-center text-sm text-gray-500">No completed orders</p>
	{:else}
		<div class="flex flex-col gap-2">
			{#each orders as order (order.id)}
				<OrderCard {order} />
			{/each}
		</div>
	{/if}
</div>
