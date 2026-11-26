<script lang="ts">
	import { CodeBlock } from "@spellkave/ui";

	const longExpr =
		"actor.stat('srd/ac') >= 1 && target.has_tag('srd.language.common') && cond(d20 + actor.stat('srd/dex') >= 13, 0 - (1d8 + 5), 0)";
</script>

<div class="grid w-full max-w-3xl gap-4">
	<CodeBlock>actor.stat('srd/ac')</CodeBlock>
	<CodeBlock>{longExpr}</CodeBlock>
</div>
