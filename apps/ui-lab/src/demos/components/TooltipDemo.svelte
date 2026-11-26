<script lang="ts">
	import { Tooltip } from "@spellkave/ui";
</script>

<div class="flex flex-wrap gap-3">
	<Tooltip content="Hit points left in this body." triggerLabel="Show hint" />
	<Tooltip content="Never shown." triggerLabel="Disabled" disabled />
</div>
