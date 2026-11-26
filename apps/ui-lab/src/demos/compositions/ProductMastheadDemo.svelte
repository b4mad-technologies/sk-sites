<script lang="ts">
	import { ProductMasthead, productNavigation } from "@spellkave/ui/composition";
</script>

<div class="grid w-full gap-6">
	<ProductMasthead navigation={productNavigation("play")} />
	<ProductMasthead
		brand="Spellkave worlds"
		contextText="admin.spellkave.com"
		account={{ displayName: "owner1 machine" }}
		onSignOut={() => {}}
		accountLinks={[
			{ label: "Your API keys", href: "https://account.spellkave.com/" },
			{ label: "Public site", href: "https://spellkave.com" },
		]}
		navigation={productNavigation("admin")}
	/>
</div>
