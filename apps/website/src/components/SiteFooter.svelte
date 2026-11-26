<script lang="ts">
	import { ThemeSwitcher } from "@spellkave/ui/theme";
	import { ATTRIBUTION_PATH } from "../lib/attribution";
	import { IMPRESSUM_PATH } from "../lib/impressum";
</script>

<footer class="site-footer">
	<span>Spellkave</span>
	<a href={ATTRIBUTION_PATH}>Attribution</a>
	<a href={IMPRESSUM_PATH}>Impressum</a>
	<span>The kave where spells never end.</span>
	<ThemeSwitcher compact />
</footer>
