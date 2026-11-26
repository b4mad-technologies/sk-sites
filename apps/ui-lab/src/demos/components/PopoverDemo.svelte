<script lang="ts">
	import { Popover, ReferenceCard } from "@spellkave/ui";
	import { href } from "../../docs/router.svelte";
</script>

<Popover triggerLabel="Open popover">
	Nearby: Mira, the stair, your pack.
</Popover>

<p class="mt-6 text-sm">A primitive composition, not Play's data-loading integration:</p>
<p class="mt-3">
	Read about <Popover triggerLabel="ReferenceCard" inline openOnHover accessibleLabel="ReferenceCard example">
		<ReferenceCard label="Component" title="ReferenceCard" href={href("/components/reference-card")}>
			<p>Hover previews; click pins. Escape or an outside click dismisses. The card itself does not own these interactions.</p>
		</ReferenceCard>
	</Popover> without leaving this example.
</p>
