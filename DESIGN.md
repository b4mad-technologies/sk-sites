---
name: Spellkave
description: The Living Grammar — a persistent world expressed through midnight jacquard, woven gold, and visible consequence.
colors:
  background: "#0d1830"
  foreground: "#efe6cf"
  card: "#111d35"
  card-foreground: "#efe6cf"
  popover: "#111d35"
  popover-foreground: "#efe6cf"
  secondary: "#1a2943"
  secondary-foreground: "#efe6cf"
  muted: "#17243c"
  muted-foreground: "#c9c2ad"
  primary: "#d3a342"
  primary-foreground: "#0d1830"
  accent: "#6e8b67"
  accent-foreground: "#f8f1df"
  destructive: "#d46b54"
  status-waiting: "#5aa9e6"
  status-reconnecting: "#e9d44d"
  border: "#8e713d"
  input: "#6f6146"
  ring: "#e6bb5a"
typography:
  display:
    fontFamily: '"Newsreader Variable", Newsreader, Georgia, serif'
    fontSize: "clamp(2.5rem, 3.15vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: "-0.035em"
  headline:
    fontFamily: '"Newsreader Variable", Newsreader, Georgia, serif'
    fontSize: "clamp(2.3rem, 5vw, 4.4rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: '"Newsreader Variable", Newsreader, Georgia, serif'
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: 'Aptos, "Segoe UI", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: 'Aptos, "Segoe UI", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.08em"
rounded:
  base: "0.18rem"
  md: "calc(0.18rem - 2px)"
  xl: "calc(0.18rem + 4px)"
  seal: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  base: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  3xl: "4rem"
components:
  button-woven-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0.75rem 1.75rem"
    height: "2.75rem"
  button-woven-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0.75rem 1.75rem"
    height: "2.75rem"
  button-woven-square:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.base}"
    size: "2.75rem"
  checkbox-woven:
    backgroundColor: "{colors.card}"
    textColor: "{colors.primary}"
    rounded: "{rounded.base}"
    size: "1.25rem"
  field-woven:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.input}"
    rounded: "{rounded.base}"
    height: "2.75rem"
  card-dark:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.base}"
    padding: "1.5rem"
  paper-band:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.base}"
    padding: "2rem"
---

# Design System: Spellkave

## Overview

**Creative North Star: "The Living Grammar"**

Spellkave is a midnight jacquard world whose rules become visible through woven gold. Pixel-weave imagery should feel inhabited and materially encoded rather than generically medieval: a person sees a meaningful possibility, chooses, witnesses the world respond, and recognizes the result as persistent history.

Across apps, the system alternates dense midnight grounds with warm loom-paper reading surfaces. Gold traces causality and interaction; sage and terracotta carry supporting state. The interface is tactile but flat, built from square woven frames, hairline divisions, texture, and semantic progression rather than glossy depth or spectacle.

**Key Characteristics:**

- Midnight jacquard ground with sparingly used woven-gold signals.
- Pixel-weave imagery that depicts an inhabited world and consequential action.
- Explicit semantic progression from seeing to choosing to response to persistent change.
- Warm paper surfaces for explanation and calm, sustained reading.
- Square woven controls and flat overlays, with circular forms reserved for seals and sequence markers.
- A firm separation between guest persuasion and authenticated operation.

## Colors

The palette pairs a deep woven night with loom-paper cream and aged gold, supported by sage for secondary signals and terracotta for destructive or error states.

### Primary

- **Woven Gold** (`primary`): the action thread, primary signal, brand accent, active emphasis, and woven control framing. Use it deliberately rather than washing whole surfaces in gold.
- **Midnight Jacquard** (`background`): the default world ground and the dark field beneath imagery, navigation, and controls.

### Secondary

- **Muted Sage** (`accent`): secondary or affirmative signals that must not compete with the gold action path.
- **Terracotta Consequence** (`destructive`): destructive actions and recoverable error states, always paired with text or iconography.
- **Waiting Blue** (`status-waiting`) and **Reconnection Yellow** (`status-reconnecting`): the owner-approved connection/action status control. Both accompany words and distinct motion or shape. The paper theme uses darker ink variants (`#22699e` and `#8a6d00`) for contrast; running and disconnected reuse `accent` and `destructive`.

### Neutral

- **Warm Loom Paper** (`foreground`): primary text on midnight and the light reading surface when the palette inverts.
- **Raised Midnight** (`card`): flat containers and overlays separated from the ground by tone and border.
- **Deep Woven Navy** (`secondary`) and **Muted Navy** (`muted`): supporting surfaces, hover zones, and grouped controls.
- **Muted Cream** (`muted-foreground`): secondary copy on dark grounds.
- **Aged-Gold Edge** (`border`) and **Deep-Gold Input Edge** (`input`): hairline structure around dark surfaces and fields.
- **Bright Focus Gold** (`ring`): the high-contrast focus-visible signal.

### Named Rules

**The Golden Thread Rule.** Gold identifies causality, primary interaction, focus, or active state; it is never ambient decoration without meaning.

**The Flat Overlay Rule.** Use a single flat translucent color over imagery when contrast needs help; do not introduce gradient blends or glossy color transitions.

## Themes

Three themes, three worlds. Each theme owns colour, type voice, control
material and page textures through the tokens in
`packages/spellkave-ui/src/tokens/styles.css` (the Living Grammar defaults)
and `packages/spellkave-ui/src/tokens/themes/<id>.css`. Components never
branch on the theme id; they read tokens and the type classes below.

| Token group | What it carries |
|---|---|
| Colour (`--background` … `--ring`) | The semantic palette |
| Faces (`--font-display`, `--font-body`, `--font-code`) | Display, body and numeral faces |
| Type voice (`--display-*`, `--title-*`, `--label-*`) | Weight, tracking, case, width and small caps per voice |
| Control material (`--control-fill-*`, `--control-outline-*`, `--control-shadow*`, `--panel-active-image`) | What a woven-frame button or an active tab is made of |
| Page material (`--ground-image`, `--paper-image`, `--map-image`, sizes) | Textures for the ground, the reading sheet, and the map plate |
| Reading pair (`--paper`, `--paper-ink`) | The light reading surface, never inverted from the ground |

Type classes: `.sk-display` (world meaning), `.sk-title`, `.sk-label`
(operation, compact), `.sk-num` (tabular figures). Use them instead of
hand-written font stacks so a theme can change voice without touching markup.

- **living-grammar** (default, dark) — **The Living Grammar.** Midnight
  jacquard, woven gold, cream ink; Newsreader display in uppercase, system
  sans body; loom-card controls with a token weave hatch and a double stitch
  line; woven pixel textures. The night world; the player's room.
- **loom-paper** (light) — **The Living Chronicle.** Rag paper (`#eee4c8`),
  iron-gall ink, a rust stamp (`#a5452d`) for action, pressed sage secondary,
  sepia rules; Alegreya display in sentence case, Alegreya Sans body, labels
  as small caps; stamped and ruled controls, no hatch, double ink rules;
  a seamless rag-paper tile as ground and sheet, an inked map fragment as the
  map plate. The reader's and chronicler's room.
- **worlds-in-motion** (dark) — **The live world board.** Blackened enamel
  (`#0f110e`), amber split-flap lettering (`#e7a936`), brass hairlines, route
  paper for the reading band; Archivo display condensed and heavy in
  uppercase, Archivo body, Sometype Mono figures; bevelled enamel plates as
  controls; an enamel tile as ground and map plate. The watcher's room.

Surfaces that must stay paper in every theme (a reading band, a speech
sheet, a material specimen) use `--paper` / `--paper-ink` plus
`--paper-image`, never an inverted `foreground` / `background` pair.

Each theme also composes the website landing differently
(`apps/website/src/landings/`): the woven scene hero, the open chronicle
spread, and the live world board. Direction contracts for all three live in
`apps/website/index.html`.

## Typography

**Display Font:** Newsreader Variable (with Newsreader, Georgia, serif fallbacks)
**Body Font:** Aptos (with Segoe UI and system sans-serif fallbacks)

**Character:** Newsreader gives the world a literary, woven-chronicle voice without becoming ornamental blackletter. The sans-serif keeps controls, labels, help, and operational density direct and contemporary.

### Hierarchy

- **Display** (regular, fluid `2.5rem–3.75rem`, `0.96` line-height): short, high-impact statements and narrative compositions; use compact line breaks and a tight silhouette.
- **Headline** (medium, fluid `2.3rem–4.4rem`, `1` line-height): section openings and major authenticated destinations.
- **Title** (medium, `1.5rem`, `1.25` line-height): cards, steps, and named places.
- **Body** (regular, `1rem`, `1.625` line-height): explanations and task copy, generally constrained to about `65ch`.
- **Label** (semibold, `0.75rem`, `0.08em` tracking): action steps, metadata, and compact state labels; uppercase is appropriate only for short scan targets.

### Named Rules

**The Two-Voice Rule.** Serif carries world meaning and narrative emphasis; sans-serif carries interface operation and explanation. Do not add a third display personality.

## Layout

Use an 8-point spacing rhythm with `4px` available only for optical correction. Shared compositions may span wide viewports, but readable text remains deliberately narrow. Dense dark regions can hold imagery and action state; warm paper bands provide a clear change of reading mode without changing the product identity.

At narrow widths, preserve the semantic order rather than the desktop silhouette: navigation may wrap, columns stack, and action-thread steps become a vertical list. Controls remain at least `44px` high, content stays visible without hover, and imagery crops around the subject rather than shrinking into illegibility.

**The Meaning-Before-Geometry Rule.** Responsive layouts may change arrangement, but they must preserve the order and relationship of possibility, choice, response, and durable consequence.

## Elevation & Depth

The system is flat by default. Depth comes from tonal layering, woven texture, borders, and rare low dark shadows under interactive frames or image plates. Overlays are flat translucent fields; there are no visual gradients, glass panels, or diffuse glows.

### Shadow Vocabulary

- **Woven Control Rest** (`0 0.55rem 1.1rem color-mix(in srgb, var(--background) 72%, transparent)`): low separation beneath raster-framed controls on dark grounds.
- **Woven Control Hover** (`0 0.75rem 1.5rem color-mix(in srgb, var(--background) 78%, transparent)`): the maximum routine lift for a hovered or focused woven control.
- **Image Plate** (`0 1.4rem 3rem rgb(13 24 48 / 22%)`): reserved for a substantial image plate resting on loom paper.

**The Flat-by-Default Rule.** A surface earns a shadow only when interaction or a physical plate needs separation; ordinary cards remain tonal and bordered.

## Shapes

The default silhouette is square and loom-cut, with only a slight corner softening (`0.18rem`). Woven CTAs, square icon actions, and seal medallions are CSS loom-cards with stitch lines and token-tinted weave; fields, tabs, cards, and checkboxes inherit the same restrained geometry. Circular shapes are a controlled exception for seals, icons, and numbered sequence markers—not the default container or button language.

Borders are thin aged-gold rules. Decorative corners and dividers come from the approved pixel-weave asset set in `@spellkave/ui`; they frame or separate meaning without becoming page wallpaper.

**The Square Loom Rule.** Default to square woven controls and containers; use circles only when the object is semantically a seal, medallion, or step marker.

## Components

Build shared interaction from `@spellkave/ui`. Accessible state primitives should remain backed by Bits UI where available; apps style and compose those primitives rather than forking their keyboard, focus, disabled, or ARIA behavior.

### Buttons

- **Shape:** square loom-card edge. Labeled CTAs are CSS (never a generated image with baked copy). Square and seal frames are CSS rings and stitch shadows, never rasters. Controls are CSS-only; raster crops are reserved for ornaments (WovenIcon, WovenDivider, WovenCorner) and page textures.
- **Primary / Secondary:** primary is gold fill with a token gold weave hatch, midnight label, and a double stitch line; secondary is midnight fill with a token midnight weave hatch, cream label, and the same double gold line. Minimum `44px` target. Ornate panel frames are not buttons.
- **Hover / Focus:** brightness and a small shadow increase on hover; a `2px` bright-gold focus outline with `4px` offset; a `1px` pressed translation. Remove transitions under reduced-motion preferences.
- **Icon:** use the CSS square frame by default (1px border, inset stitch). The CSS seal frame (`border-radius: 9999px` plus a dotted inner stitch) is reserved for a genuine medallion action, never as a generic round icon button.

### Checkbox

- **Style:** Bits UI state behavior inside a CSS square frame (`1.25rem`, 1px border plus a single 1px inset ring) with an adjacent visible label.
- **State:** checked and indeterminate states use the primary fill plus the gold weave hatch; invalid state uses terracotta plus recovery text; disabled controls remain visible and legible.

### Fields

- **Shape:** square loom-cut edge (`0.18rem`). The label is visible and sits above the control, never inside the value.
- **Style:** midnight fill with cream value text and a Deep-Gold Input Edge (`input`). Labels use the Label type. The control is at least `44px` high.
- **State:** focus uses the standard bright-gold ring on the midnight ground; invalid state uses terracotta plus recovery text; disabled controls remain visible and legible.

### Tabs

- **Style:** Bits UI tabs sit on one aged-gold baseline. The active trigger is a raised card surface with a midnight weave hatch and a gold label; inactive tabs use muted cream. The panel is not textured.
- **State:** hover uses a muted navy field, focus uses the standard gold ring, and disabled triggers remain visible while leaving keyboard navigation.

### Cards / Containers

- **Corner Style:** near-square (`0.18rem`).
- **Background:** raised midnight on dark grounds; warm loom paper for explanatory bands.
- **Shadow Strategy:** tonal and bordered by default; reserve the image-plate shadow for substantial imagery.
- **Border:** one thin aged-gold rule.
- **Internal Padding:** generally `1rem–2rem`, increasing for wide editorial compositions.

### Navigation

Product navigation uses the shared masthead: a gold serif wordmark, warm links, diamond separators, visible hover and focus states, and `44px` minimum targets. On narrow screens it may wrap into its own bordered row without hiding destinations.

### Shared Compositions

- **Product Masthead:** the cross-app guest navigation expression. Keep its brand, destination, sign-in, responsive, and focus behavior centralized.
- **Narrative Hero:** pairs a short promise with an inhabited pixel-weave scene and a semantic action thread. Reuse the composition when a surface must explain how world action becomes lasting change; content and action destinations remain surface-owned.
- **Journey Band:** a warm paper progression for a small number of equal steps. Reuse its material and sequence grammar when orientation benefits from it; it does not prescribe a universal marketing page sequence.

### Authenticated and Guest Surfaces

Guest surfaces may use the persuasive shared compositions and broad narrative imagery. Once authenticated, shift to task-oriented headings, compact tonal containers, and role-relevant controls while retaining the same tokens, type, shapes, and focus language. Authentication routing and page composition remain app concerns.

## Do's and Don'ts

### Do:

- **Do** use semantic tokens and shared `@spellkave/ui` primitives before adding app-local visual rules.
- **Do** make consequence visible as a legible progression whenever a surface explains the world model.
- **Do** use pixel-weave imagery to show inhabited places, choices, and changes—not as interchangeable fantasy wallpaper.
- **Do** preserve keyboard reachability, visible focus, text-backed state, and reduced-motion behavior.
- **Do** keep guest persuasion visually and structurally separate from authenticated tasks.

### Don't:

- **Don't** lead a guest experience with AI, MCP, fifth edition, infrastructure, or implementation language.
- **Don't** use gradients for depth or glass; the flat 1px weave hatch on controls is the one sanctioned gradient use. Do not use glassmorphism, pill-shaped controls, generic rounded cards, or ornamental gold without semantic purpose.
- **Don't** paint a control with a raster crop — a texture cannot follow a theme switch.
- **Don't** universalize a single website section, exact copy passage, page order, or authentication route.
- **Don't** fork Bits UI behavior or duplicate shared compositions inside an app when `@spellkave/ui` owns the pattern.
- **Don't** rely on color alone to express sequence, ownership, error, selection, or permission.
