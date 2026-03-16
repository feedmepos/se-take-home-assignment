<script lang="ts">
	import { addOrder, addBot, removeBot } from '$lib/websocket';
</script>

<div class="flex flex-wrap justify-center gap-3 p-4">
	<button
		onclick={() => addOrder('normal')}
		class="rounded-lg bg-[#DA291C] px-5 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#b8221a] active:scale-95 cursor-pointer"
	>
		New Normal Order
	</button>
	<button
		onclick={() => addOrder('vip')}
		class="rounded-lg bg-[#FFC72C] px-5 py-3 font-bold text-[#27251F] shadow-lg transition-all hover:scale-105 hover:bg-[#e6b327] active:scale-95 cursor-pointer"
	>
		New VIP Order
	</button>
	<button
		onclick={() => addBot()}
		class="rounded-lg border-2 border-[#FFC72C] bg-transparent px-5 py-3 font-bold text-[#FFC72C] shadow-lg transition-all hover:scale-105 hover:bg-[#FFC72C] hover:text-[#27251F] active:scale-95 cursor-pointer"
	>
		+ Bot
	</button>
	<button
		onclick={() => removeBot()}
		class="rounded-lg border-2 border-[#DA291C] bg-transparent px-5 py-3 font-bold text-[#DA291C] shadow-lg transition-all hover:scale-105 hover:bg-[#DA291C] hover:text-white active:scale-95 cursor-pointer"
	>
		- Bot
	</button>
</div>
