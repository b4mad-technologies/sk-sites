# `@spellkave/ui`

Small shared Svelte primitive kit for Spellkave browser apps.

## Exports

- `Button` — shared button API used across the browser apps.
- `Tabs` — stateful bits-ui tab wrapper for segmented content.
- `Checkbox` — accessible label + state wrapper built on bits-ui.
- `DateTimePicker` — bits-ui date picker with minute granularity and a UTC ISO bind.
- `Input` and `Textarea` — bare text controls. `Field` is the labelled wrapper (label, description, error) around an Input-styled control; do not replace Field with a raw Input when the visible label is required.
- `Badge` — compact status chip.
- `@spellkave/ui/doc-reader` — pieces for reading repository docs: `FreshnessBadge` (age of the last commit), `ReadingPath` (role picker plus ordered steps), `DocIndex` (grouped, filterable doc list with status pills and related links), and `mermaidDiagrams` / `renderMermaid`, which draw ```` ```mermaid ```` blocks in the browser with `securityLevel: "strict"` and no HTML labels. Mermaid loads on first use only.
- `Card` — raised container (`card-dark` padding and radius).
- `Accordion`, `Dialog`, `Popover`, `Select`, `Tooltip`, `ScrollArea`, `Progress`, `RadioGroup`, `Switch` — play-needed bits-ui wrappers with Living Grammar styling.
- `ProductMasthead`, `NarrativeHero`, and `JourneyBand` — the shared Living
  Grammar composition with semantic slots, responsive defaults, and
  package-owned raster artwork. `ProductMasthead` carries brand, optional
  context (`contextText` or `contextSnippet`), navigation, and an account cluster: sign-in
  when there is no session, or a display name and sign-out action when there
  is. `accountSnippet` replaces that cluster for app extras and leaves room
  for a later site switcher. The cluster is presentation only.
- `WovenIcon`, `WovenDivider`, and `WovenCorner` — package-owned raster
  ornaments with accessible Svelte wrappers and no image-baked interface text.
- `woven*Urls` — icon, divider, corner, and material URLs for shared
  compositions that need direct asset placement.
- `tokens` — DEFAULT theme (Living Grammar) hex constants for non-DOM contexts. Runtime UI must read CSS variables.
- `@spellkave/ui/theme` — theme registry, cookie-backed store, boot snippet, and `ThemeSwitcher`.
- `styles.css` — shared Living Grammar global stylesheet (`@spellkave/ui/styles.css`, sourced from `src/tokens/styles.css`) for account, operator, play, and ui-lab. App-local sheets add only `@source` for that app's files, plus play's hero-choice rules.

## Notes

## Adding a primitive

`just ui-add <name>` runs pinned `shadcn-svelte@1.5.1` against this package (`-c packages/spellkave-ui --no-deps-install -y --skip-preflight`). Re-skin the generated files to semantic tokens (Rule C), export `Root as X` from `src/index.ts` and add a `package.json` exports map entry, then add a ui-lab sample.

The 1.5.1 CLI requires `compilerOptions.paths` in this package's `tsconfig.json` (`$lib` → `./src/lib`, `$ui` → `./src`). It does not read `svelte.config.js` `kit.alias` here — this package is not SvelteKit (`svelte.config.js` is preprocess only). `--skip-preflight` is required because Tailwind is a peer dependency, not installed inside this package's `node_modules`. `--no-deps-install` still writes `package.json`; reconcile by hand and do not keep `lucide-svelte` / `@lucide/svelte`. Generated files import `$lib/utils.js`; rewrite those to relative `../lib/utils` so consuming apps do not need a `$lib` alias into this package.

- Keep this package limited to reusable controls and compositions.
- Preserve domain content and product flows in the consuming app; keep repeated
  visual composition here.
- `bits-ui` is used only for primitives that need real headless state.
- Add a primitive with `just ui-add <name>`, re-skin to tokens, export it, then
  sample it in `apps/ui-lab`. CI still rejects direct app `bits-ui` imports and
  app-local `components/ui` copies.
- Add or change examples in `apps/ui-lab` whenever a shared primitive's public
  states or visual contract changes.
- Woven button variants keep their text, focus ring, disabled state, and hit
  target in the `Button` primitive; the woven look is CSS (token weave and stitch), not a raster frame.
- Shipping illustration files live in `src/assets/` beside exact-prompt JSON
  provenance. Apps consume the composition export instead of copying the
  artwork or drawing local scene placeholders.
- Woven UI crops and generation provenance live in
  `src/assets/woven-ui/manifest.json`; do not hand-copy them into apps.
- The default reference intentionally uses four linked story steps and three
  journey steps. Use the typed snippets or a separate composition when a
  product needs a different narrative shape.

## Themes

The unadorned `:root` block in `src/tokens/styles.css` is Living Grammar
(id `living-grammar`). Additional themes live in `src/tokens/themes/<id>.css`
as `:root[data-theme="<id>"]` overrides. They may change tokens only — not
component structure, spacing, or type scale.

`--muted` is the text tint; `--muted-surface` is the fill. Tailwind `bg-muted`
maps to `--muted-surface` via `@theme inline`. Do not rename these now.

Shipped extras:

- `loom-paper` — the living chronicle: rag paper, iron-gall ink, a rust stamp for action.
- `worlds-in-motion` — the live world board: blackened enamel, amber split-flap lettering, brass hairlines.

The choice is stored in the `sk_theme` cookie (`Path=/; SameSite=Lax; 1 year`;
`Domain=.spellkave.com` only on `spellkave.com` and its subdomains) so one
pick follows the owner across apps. The default id unsets `data-theme`.

Vite apps add `spellkaveThemeBoot()` from `@spellkave/ui/vite` as the first
plugin so `THEME_BOOT_SCRIPT` is injected into `<head>` before first paint.
The string export remains for non-Vite consumers that paste it themselves.
Call `initTheme()` when the app mounts so the store matches the cookie.

To add a theme:

1. Add `src/tokens/themes/<id>.css` covering every token in `DESIGN_TOKENS`
   (`just check-ui-primitives` Rule F) plus `--font-display` and
   `color-scheme`. Import it from `styles.css` next to the other theme imports.
2. Append `{ id, label, description, scheme }` to `THEMES` in `src/theme/themes.ts`.
3. If the theme is light, add its id to the boot snippet's light map in
   `src/theme/boot.ts`. Vite apps pick up the new string via the plugin;
   non-Vite consumers must recopy `THEME_BOOT_SCRIPT`.
4. Run `just check-ui-primitives` — Rule F must list the new file.
