<script lang="ts">
	import { onMount } from 'svelte';
	import { connect } from '$lib/websocket';
	import { state } from '$lib/stores/orders';
	import Controls from '$lib/components/Controls.svelte';
	import PendingArea from '$lib/components/PendingArea.svelte';
	import CompleteArea from '$lib/components/CompleteArea.svelte';
	import BotPanel from '$lib/components/BotPanel.svelte';

	onMount(() => connect());
</script>

<div class="min-h-screen bg-[#27251F] text-white">
	<header class="bg-[#DA291C] p-4 text-center shadow-lg">
		<h1 class="text-3xl font-bold text-[#FFC72C]">McDonald's Order System</h1>
	</header>

	<Controls />

	<div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
		<PendingArea orders={$state.pending_orders} bots={$state.bots} />
		<CompleteArea orders={$state.completed_orders} />
		<BotPanel bots={$state.bots} />
	</div>
</div>
