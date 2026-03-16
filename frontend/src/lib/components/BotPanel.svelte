<script lang="ts">
	import type { Bot } from '$lib/types';

	let { bots = [] }: { bots: Bot[] } = $props();
</script>

<div class="rounded-xl border border-[#4a4843] bg-[#2f2d28] p-4">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-xl font-bold text-[#DA291C]">BOTS</h2>
		<span class="rounded-full bg-[#4a4843] px-2 py-0.5 text-sm text-gray-300">{bots.length}</span
		>
	</div>
	{#if bots.length === 0}
		<p class="text-center text-sm text-gray-500">No bots active</p>
	{:else}
		<div class="flex flex-col gap-2">
			{#each bots as bot (bot.id)}
				<div
					class="flex items-center justify-between rounded-lg border border-[#4a4843] bg-[#3a3733] p-3 {bot.status === 1
						? 'animate-pulse'
						: ''}"
				>
					<span class="font-bold text-white">Bot #{bot.id}</span>
					{#if bot.status === 1 && bot.order}
						<span class="text-sm text-orange-400">Processing #{bot.order.id}</span>
					{:else}
						<span class="text-sm text-gray-500">IDLE</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
