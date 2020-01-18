<script>
	import { onMount } from 'svelte';

	let MyComponent;

	onMount(async () => {
		const module = await import('../components/main.svelte');
		MyComponent = module.default;
	});
</script>

<svelte:component this={MyComponent} foo="bar"/>