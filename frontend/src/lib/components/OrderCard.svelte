<script lang="ts">
	import type { Order, Bot } from '$lib/types';

	let { order, bots = [] }: { order: Order; bots?: Bot[] } = $props();

	const statusLabels = ['PENDING', 'PROCESSING', 'COMPLETE'];
	const statusColors = ['text-yellow-400', 'text-orange-400', 'text-green-400'];

	let assignedBot = $derived(bots.find((b) => b.order?.id === order.id));
</script>

<div
	class="relative rounded-lg border bg-[#3a3733] p-3 shadow-md transition-all {order.type === 1
		? 'border-[#FFC72C]'
		: 'border-[#4a4843]'} {order.status === 1 ? 'animate-pulse' : ''}"
>
	<div class="mb-1 flex items-center justify-between">
		<span class="text-lg font-bold text-white">#{order.id}</span>
		{#if order.type === 1}
			<span class="rounded-full bg-[#FFC72C] px-2 py-0.5 text-xs font-bold text-[#27251F]"
				>VIP</span
			>
		{:else}
			<span class="rounded-full bg-[#4a4843] px-2 py-0.5 text-xs font-bold text-gray-300"
				>Normal</span
			>
		{/if}
	</div>
	<div class="text-sm {statusColors[order.status]}">
		{statusLabels[order.status]}
	</div>
	{#if assignedBot}
		<div class="mt-1 text-xs text-gray-400">Bot #{assignedBot.id}</div>
	{/if}
</div>
