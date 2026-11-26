# Barbarian flatten — OpenAI vs GLM

*2026-09-18T14:55:30Z by Showboat 0.6.1*
<!-- showboat-id: 6b67b72a-bb9b-48e5-8bdb-cfa834b27d0b -->

System:
You write player-facing class summaries for a 5e-compatible game. Follow the user rules exactly. Output only the summary text.

User:
Flatten the Barbarian Core Traits table into ONE paragraph, table order, period-joined sentences.

Rules:
- Labels and values must match the facts byte-for-byte (spell out Strength, not STR).
- Do not invent lore, caster type, source pointers, ids, or implementation notes.
- No markdown, no bullets, no leading class name restatement beyond the first label.

Facts:
Primary Ability: Strength
Hit Point Die: D12 per Barbarian level
Saving Throw Proficiencies: Strength and Constitution
Skill Proficiencies: Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival
Weapon Proficiencies: Simple and Martial weapons
Armor Training: Light and Medium armor and Shields
Starting Equipment: Choose A or B: (A) Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP; or (B) 75 GP

flatten/openai-gpt-4.1

```bash
pnpm exec tsx packages/spellkave-design-gen/bin/skgen.js prose generate packages/spellkave-design-gen/samples/barbarian-flatten.prose-manifest.json --confirm-paid --only flatten/openai-gpt-4.1 --format text
```

```output
Primary Ability: Strength. Hit Point Die: D12 per Barbarian level. Saving Throw Proficiencies: Strength and Constitution. Skill Proficiencies: Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival. Weapon Proficiencies: Simple and Martial weapons. Armor Training: Light and Medium armor and Shields. Starting Equipment: Choose A or B: (A) Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP; or (B) 75 GP.
```

flatten/openai-gpt-4o

```bash
pnpm exec tsx packages/spellkave-design-gen/bin/skgen.js prose generate packages/spellkave-design-gen/samples/barbarian-flatten.prose-manifest.json --confirm-paid --only flatten/openai-gpt-4o --format text
```

```output
Primary Ability: Strength. Hit Point Die: D12 per Barbarian level. Saving Throw Proficiencies: Strength and Constitution. Skill Proficiencies: Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival. Weapon Proficiencies: Simple and Martial weapons. Armor Training: Light and Medium armor and Shields. Starting Equipment: Choose A or B: (A) Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP; or (B) 75 GP.
```

flatten/zai-glm-5.2

```bash
pnpm exec tsx packages/spellkave-design-gen/bin/skgen.js prose generate packages/spellkave-design-gen/samples/barbarian-flatten.prose-manifest.json --confirm-paid --only flatten/zai-glm-5.2 --format text
```

```output
Primary Ability: Strength. Hit Point Die: D12 per Barbarian level. Saving Throw Proficiencies: Strength and Constitution. Skill Proficiencies: Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival. Weapon Proficiencies: Simple and Martial weapons. Armor Training: Light and Medium armor and Shields. Starting Equipment: Choose A or B: (A) Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP; or (B) 75 GP.
```

flatten/zai-glm-5.3

```bash
pnpm exec tsx packages/spellkave-design-gen/bin/skgen.js prose generate packages/spellkave-design-gen/samples/barbarian-flatten.prose-manifest.json --confirm-paid --only flatten/zai-glm-5.3 --format text
```

```output
Primary Ability: Strength. Hit Point Die: D12 per Barbarian level. Saving Throw Proficiencies: Strength and Constitution. Skill Proficiencies: Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival. Weapon Proficiencies: Simple and Martial weapons. Armor Training: Light and Medium armor and Shields. Starting Equipment: Choose A or B: (A) Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP; or (B) 75 GP.
```
