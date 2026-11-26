<script lang="ts">
	import { Button } from "@spellkave/ui/button";
	import { ActivityRow, ChatEntry, ThoughtRow } from "@spellkave/ui/chat";
	import { Markdown } from "@spellkave/ui/markdown";

	let selected = $state(false);
	const started = Date.now() - 4_000;
</script>

<div class="flex w-full max-w-2xl flex-col gap-3">
	<ChatEntry tone="person" label="You" meta="#12">
		<p>Create a world called alpha.</p>
	</ChatEntry>
	<ThoughtRow text={"The owner wants a new world.\nCheck the registry first."} />
	<ActivityRow
		steps={[
			{ id: "1", label: "world_list", status: "done" },
			{ id: "2", label: "world_request", status: "done" },
		]}
		working={false}
		startedAt={started}
		endedAt={started + 2_300}
		{selected}
		onopen={() => (selected = !selected)}
	/>
	<ActivityRow steps={[{ id: "3", label: "world_status", status: "running" }]} working startedAt={started} />
	<ChatEntry tone="host" label="Host" meta="#15" outcome="ok">
		<p>Request 1 (create alpha) done: world is running.</p>
	</ChatEntry>
	<ChatEntry tone="host" label="Host" meta="#16" outcome="failed">
		<p>Request 2 (wipe alpha) failed: the node did not answer.</p>
	</ChatEntry>
	<ChatEntry tone="agent" label="World setup" meta="#17">
		<Markdown source={"World **alpha** is up.\n\n- url: `http://127.0.0.1:10279`"} />
		{#snippet actions()}
			<Button size="sm" variant="ghost">Copy</Button>
			<Button size="sm" variant="ghost">Reply</Button>
		{/snippet}
	</ChatEntry>
	<ChatEntry tone="failure" label="Run failed">
		<p>The model could not answer this input.</p>
	</ChatEntry>
</div>
