<script lang="ts">
	import { Markdown } from "@spellkave/ui/markdown";

	const source = `World **alpha** is up on \`127.0.0.1:10279\`.

- adventure: kavemouth-npc
- saves: save-two, save-three

\`\`\`sh
sk dev status
\`\`\`

| field | value |
|---|---|
| running | true |

Raw HTML stays text: <b>not bold</b>. Only safe links work: [docs](https://spellkave.com).`;
</script>

<div class="w-full max-w-xl rounded-[var(--radius)] border border-[color:var(--border)] p-4">
	<Markdown {source} />
</div>
