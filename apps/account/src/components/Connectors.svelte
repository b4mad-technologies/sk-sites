<script lang="ts">
	import { ConnectorList, type ConnectorListItem } from "@spellkave/ui";
	import { type AccountApi, formatAccountApiError } from "../lib/account-api";

	/**
	 * "Disconnect connectors" (ADR-0161 D-7): signing out keeps Claude, Codex
	 * and other connected clients working; this list ends their authorization.
	 */
	let { api }: { api: AccountApi } = $props();

	let connectors = $state<ConnectorListItem[]>([]);
	let busy = $state(false);
	let status = $state<string | null>(null);
	let loaded = $state(false);

	async function load(client: AccountApi): Promise<void> {
		const rows = await client.listConnectors();
		connectors = rows.map((row) => ({ id: row.client_id, name: row.name }));
	}

	$effect(() => {
		const client = api;
		let cancelled = false;
		void load(client).then(
			() => {
				if (!cancelled) loaded = true;
			},
			(cause) => {
				if (cancelled) return;
				status = formatAccountApiError(cause);
				loaded = true;
			},
		);
		return () => {
			cancelled = true;
		};
	});

	async function disconnect(id: string | null): Promise<void> {
		if (busy) return;
		busy = true;
		status = null;
		const count = id === null ? connectors.length : 1;
		try {
			await api.disconnectConnectors(id ?? undefined);
			status = count === 1 ? "Disconnected." : `Disconnected ${count} apps.`;
			await load(api);
		} catch (cause) {
			status = formatAccountApiError(cause);
		} finally {
			busy = false;
		}
	}
</script>

{#if loaded}
	<ConnectorList {connectors} {busy} {status} onDisconnect={(id) => void disconnect(id)} />
{/if}
