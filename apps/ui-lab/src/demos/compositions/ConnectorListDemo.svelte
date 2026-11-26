<script lang="ts">
	import { ConnectorList } from "@spellkave/ui/composition";

	let connectors = $state([
		{ id: "client_claude", name: "Claude" },
		{ id: "client_codex", name: "Codex" },
	]);
	let status = $state<string | null>(null);

	function disconnect(id: string | null): void {
		const gone = connectors.filter((c) => id === null || c.id === id);
		connectors = connectors.filter((c) => !gone.includes(c));
		status = `${gone.length} disconnected.`;
	}
</script>

<div class="w-full max-w-xl">
	<ConnectorList {connectors} {status} onDisconnect={disconnect} />
</div>
