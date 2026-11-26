# Account Surface

- Primary target: `apps/account/src/App.svelte`
- Related targets: `apps/account/src/components/Identity.svelte`,
  `apps/account/src/components/TokenBoard.svelte`,
  `apps/account/src/components/CopyField.svelte`,
  `apps/account/src/components/ConnectKey.svelte`
- Mode: operate
- Audience: a signed-in person who needs to know who they are to Spellkave and
  to get, hold, or withdraw a key that lets an agent act as them
- Job: confirm my identity and worlds, mint a key, use it, and revoke it
  without ever being unsure whether a secret is still on screen
- Primary action: create an API key; secondary action: revoke one
- Proof: the real account record from the Account API, real key metadata, the
  real connect instructions an MCP client needs
- Constraints: preserve the WorkOS session gate, the silent-login path, the
  same-origin Worker proxy, the show-once secret contract, and the
  two-step revoke confirmation. A secret must never become easier to reveal
  than it is today. `@spellkave/ui` has NO field, input, label or table
  primitive — do not write the brief or the code as if it did; fields are
  styled from tokens until a shared primitive exists.

## Approved direction

This is the page a person visits when something is already wrong or about to
be permanent — a key is missing, a key leaked, an agent stopped working. It
should feel calm, dense, and reversible-where-it-is and final-where-it-is-not.

The Living Grammar reading here is **loom paper for explanation, midnight for
possession**: the "how to use a key" material is reading matter and earns a
warm paper band; identity and the key list are compact tonal containers on
midnight. That contrast is the whole visual argument of the page — what you
read versus what you own.

Four specific corrections the current markup owes DESIGN.md — each verified
against the tree, not assumed:

1. **The palette escapes the system in the one place it matters most.** The
   show-once secret in `TokenBoard.svelte:110` already has its own container
   and its own "shown once" sentence — that part is right. But it is painted
   `border-amber-300 bg-amber-50 text-amber-950`, Tailwind's named palette,
   not tokens. The most consequential object on the page is the only one
   outside the design system.
2. **The radius names are mixed, though not as badly as they look.** This app
   DOES import the shared stylesheet, and `tokens/styles.css:6-9` remaps the
   whole Tailwind radius scale onto `--radius` (`sm` = -4px, `md` = -2px,
   `lg` = exact, `xl` = +4px). So `rounded-lg` is already correct and the
   others are only a few px off — this is inconsistency, not a broken
   silhouette. Unify on `rounded-[var(--radius)]` so the shape stops depending
   on remembering the remap: `rounded-xl` on the secret box, the mint form and
   `ConnectKey`; `rounded-md` on `CopyField` and the name input; bare `rounded`
   on the error alert.
3. **The 44px rule is already being broken across the whole surface.** Create,
   revoke, show/hide and copy are all `size="sm"`. DESIGN.md sets `44px` as the
   minimum target; this is not a new requirement introduced by re-clothing, it
   is an existing violation the re-clothing must fix.
4. **`ConnectKey` is three copyable items in one undifferentiated slab.** MCP
   URL, Claude Code, Codex. Three items is a real `Accordion`'s job if they
   should collapse; a single disclosure is the alternative. Either is honest —
   what is not honest is leaving three peer instructions with no structure.

Two things the earlier draft of this brief got wrong, recorded so nobody
"fixes" them: the secret is NOT styled like body text (it has a container),
and `ConnectKey` does NOT push the key list down the page (the order is
Identity -> TokenBoard -> ConnectKey, so keys are already above instructions).
Collapsing the instructions is a density choice, not a fold rescue.

## Fidelity inventory

| Approved element | Commitment | Implementation |
| --- | --- | --- |
| Identity | Who I am and which worlds, above everything | tonal container, `title` type |
| Key list | Dense, scannable, one row per key with its state in words | `@spellkave/ui` container grammar, `label` type for metadata |
| Show-once secret | Unmistakably temporary and unmistakably a secret, in SYSTEM colours | existing container, repainted from `destructive`/`primary` tokens instead of `amber-*` |
| Reveal / copy | Reveal state is visible without hover AND exposed programmatically | `Button` + visible Show/Hide label (already present) + `aria-pressed`; NOT a `Tooltip` — the control is already labelled |
| Revoke | Two steps, destructive named in words, never colour alone | already inline, two-step and `variant="destructive"` — the remaining gaps are the `44px` target and a confirm label that names what is revoked |
| Connect instructions | Reading matter, on paper, structured as the three peer items it is | warm paper band + `Accordion` (3 items) or one disclosure; state the choice |
| Gate states | loading, unconfigured, signed-out, checking each say something true | semantic HTML, unchanged copy intent |
| Errors | `role="alert"`, terracotta plus words | `destructive` token + text |
