<script lang="ts">
	let { message, keys = "", id, tone = "muted" }: { message: string; keys?: string; id?: string; tone?: string } = $props();
</script>

<div class="dock-help-line" data-testid="dock-help-line">
	<p {id} role="status" aria-live="polite" data-role={tone} title={message}>{message}</p>
	<span aria-hidden="true">{keys}</span>
</div>

<style>
	.dock-help-line { display: flex; align-items: baseline; gap: 1rem; min-inline-size: 0; font: 0.75rem/1.3 var(--font-body, sans-serif); color: var(--muted-foreground); }
	p { flex: 1; min-inline-size: 0; margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
	span { flex-shrink: 0; white-space: nowrap; }
	p[data-role="error"], p[data-role="stale"] { color: var(--destructive); }
	@media (max-width: 60rem) { span { display: none; } }
</style>
