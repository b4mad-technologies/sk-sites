<script lang="ts">
	import { cn } from "../lib/utils";
	import WovenIcon from "../woven/WovenIcon.svelte";
	import { productNavigation } from "./product-navigation";
	import type { ProductMastheadProps } from "./types";

	const brandClass =
		"group/brand flex min-h-11 w-fit items-center gap-3 whitespace-nowrap [font-family:var(--font-display)] text-sm tracking-[0.16em] text-[color:var(--primary)] no-underline sm:text-lg lg:text-2xl";
	const accountActionClass =
		"flex min-h-11 items-center [font-family:var(--font-display)] text-base text-[color:var(--foreground)] no-underline transition-colors hover:text-[color:var(--primary)] sm:text-lg";
	const accountLinkClass =
		"flex min-h-11 items-center text-sm text-[color:var(--foreground)] no-underline transition-colors hover:text-[color:var(--primary)]";

	let {
		class: className,
		brand = "SPELLKAVE",
		brandHref = "#top",
		navigation = productNavigation(),
		navSnippet,
		contextText,
		contextSnippet,
		signInLabel = "Sign in",
		signInHref = "#sign-in",
		onSignIn,
		account = null,
		signOutLabel = "Sign out",
		onSignOut,
		accountLinks = [],
		accountSnippet,
		ariaLabel = "Spellkave product navigation",
		...restProps
	}: ProductMastheadProps = $props();

	const hasNav = $derived(navSnippet != null || navigation.length > 0);
	const showSignIn = $derived(account == null && (onSignIn != null || Boolean(signInHref)));
	// Website-style "Sign in" is a single short control and can share the brand
	// row below lg. Any signed-in cluster, accountLinks, or snippet is too wide
	// and must drop to its own row so the brand column cannot overlap it.
	const accountSharesBrandRow = $derived(
		accountSnippet == null && account == null && accountLinks.length === 0 && showSignIn,
	);
</script>

{#snippet brandMark()}
	<svg class="size-8 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
		<path d="M16 2 30 16 16 30 2 16 16 2Z" stroke="currentColor" stroke-width="1.2" />
		<path d="m16 7 9 9-9 9-9-9 9-9Z" stroke="currentColor" stroke-width="1.2" />
		<path d="M2 16h28M16 2v28M7 7l18 18M25 7 7 25" stroke="currentColor" stroke-width="0.8" opacity="0.7" />
	</svg>
{/snippet}

<header
	data-slot="product-masthead"
	class={cn(
		"relative z-30 border-b border-[color:var(--primary)]/55 bg-[color:var(--background)] text-[color:var(--foreground)]",
		className
	)}
	{...restProps}
>
	<div
		class={cn(
			"mx-auto grid min-h-16 max-w-[96rem] items-center gap-x-4 px-4 sm:px-7 lg:px-10",
			accountSharesBrandRow ? "grid-cols-[1fr_auto]" : "grid-cols-1",
			hasNav ? "lg:grid-cols-[1fr_auto_1fr]" : "lg:grid-cols-[1fr_auto]",
		)}
	>
		<div class="flex min-w-0 flex-wrap items-center gap-3">
			{#if brandHref}
				<a href={brandHref} data-slot="product-masthead-brand" class={brandClass}>
					{@render brandMark()}
					<span>{brand}</span>
				</a>
			{:else}
				<span data-slot="product-masthead-brand" class={brandClass}>
					{@render brandMark()}
					<span>{brand}</span>
				</span>
			{/if}

			{#if contextSnippet}
				<div data-slot="product-masthead-context" class="w-full min-w-0 lg:w-auto">
					{@render contextSnippet()}
				</div>
			{:else if contextText}
				<p
					data-slot="product-masthead-context"
					class="m-0 hidden [font-family:var(--font-display)] text-sm text-[color:var(--foreground)]/70 sm:block sm:text-base"
				>
					{contextText}
				</p>
			{/if}
		</div>

		{#if hasNav}
			<nav
				class={cn(
					"order-3 flex flex-wrap justify-center gap-x-3 gap-y-1 border-t border-[color:var(--primary)]/20 py-3 text-sm sm:gap-x-7 sm:gap-y-2 lg:order-none lg:col-span-1 lg:flex-nowrap lg:gap-10 lg:border-0 lg:py-0 lg:text-base",
					accountSharesBrandRow ? "col-span-2" : "col-span-1",
				)}
				aria-label={ariaLabel}
			>
				{#if navSnippet}
					{@render navSnippet()}
				{:else}
					{#each navigation as item}
						<a
							href={item.href}
							aria-current={item.current ? "page" : undefined}
							class={cn(
								"group/nav flex min-h-11 items-center gap-3 text-[color:var(--foreground)] no-underline transition-colors hover:text-[color:var(--primary)]",
								item.current && "text-[color:var(--primary)]",
							)}
						>
							{#if item.icon}
								<WovenIcon name={item.icon} size="md" />
							{/if}
							{item.label}
							<span
								class={cn(
									"size-1.5 bg-[color:var(--primary)] transition-transform group-hover/nav:rotate-45",
									item.current && "rotate-45",
								)}
								aria-hidden="true"
							></span>
						</a>
					{/each}
				{/if}
			</nav>
		{/if}

		<div
			data-slot="product-masthead-account"
			class={cn(
				"flex min-h-11 flex-wrap items-center justify-end gap-x-4 gap-y-1 lg:w-auto lg:gap-3",
				!accountSharesBrandRow && "w-full",
			)}
		>
			{#if accountSnippet}
				{@render accountSnippet()}
			{:else}
				{#if account}
					<span class="flex min-h-11 items-center text-sm text-[color:var(--foreground)]/70"
						>{account.displayName}</span
					>
					{#if onSignOut}
						<button type="button" class={accountActionClass} onclick={onSignOut}>
							{signOutLabel}
						</button>
					{/if}
				{:else if showSignIn}
					{#if onSignIn}
						<button type="button" class={accountActionClass} onclick={onSignIn}>
							<span class="mr-3 size-1.5 bg-[color:var(--primary)]" aria-hidden="true"></span>
							{signInLabel}
						</button>
					{:else if signInHref}
						<a href={signInHref} class={accountActionClass}>
							<span class="mr-3 size-1.5 bg-[color:var(--primary)]" aria-hidden="true"></span>
							{signInLabel}
						</a>
					{/if}
				{/if}
				{#each accountLinks as item}
					<a
						href={item.href}
						aria-current={item.current ? "page" : undefined}
						class={accountLinkClass}
					>
						{item.label}
					</a>
				{/each}
			{/if}
		</div>
	</div>
</header>
