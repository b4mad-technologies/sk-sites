# Barbarian MCP digest — OpenAI vs GLM

*2026-09-18T14:55:59Z by Showboat 0.6.1*
<!-- showboat-id: ac76a47d-30a8-49d8-9ce1-4332af667508 -->

System:
You write the one string an in-play MCP item_detail fallback returns. A model DM and a human player both read it. Output only that string.

User:
Write 1–3 sentences for Barbarian that a model DM can read aloud at character creation.

Rules:
- Include the mechanical facts a player needs to choose the class (hit die, primary ability, armor/weapons).
- Never use developer vocabulary (Caster Type, entity_def, seeded, Source: cache, pk=, IDENTITY).
- No markdown.

Facts:
Primary Ability: Strength
Hit Point Die: D12 per Barbarian level
Saving Throw Proficiencies: Strength and Constitution
Skill Proficiencies: Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival
Weapon Proficiencies: Simple and Martial weapons
Armor Training: Light and Medium armor and Shields
Starting Equipment: Choose A or B: (A) Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP; or (B) 75 GP

mcp-digest/openai-gpt-4.1

```bash
pnpm exec tsx packages/spellkave-design-gen/bin/skgen.js prose generate packages/spellkave-design-gen/samples/barbarian-mcp-digest.prose-manifest.json --confirm-paid --only mcp-digest/openai-gpt-4.1 --format text
```

```output
Barbarians are fierce warriors whose strength is their greatest asset. You gain a d12 hit die each level and are proficient with Strength and Constitution saving throws. As a Barbarian, you can wear light or medium armor and use shields, wield both simple and martial weapons, and choose two proficiencies from Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival; begin with either a greataxe, four handaxes, an explorer’s pack and 15 gold, or 75 gold to buy your own gear.
```

mcp-digest/openai-gpt-4o

```bash
pnpm exec tsx packages/spellkave-design-gen/bin/skgen.js prose generate packages/spellkave-design-gen/samples/barbarian-mcp-digest.prose-manifest.json --confirm-paid --only mcp-digest/openai-gpt-4o --format text
```

```output
As a Barbarian, you harness raw strength to unleash devastating power in battle, with a hit point die of D12 for maximum resilience. Your primary ability is Strength, and you'll have saving throw proficiencies in both Strength and Constitution. You can wield both simple and martial weapons, and you'll be trained in wearing light and medium armor as well as using shields. Choose two skills from Animal Handling, Athletics, Intimidation, Nature, Perception, and Survival, and start with either a greataxe, four handaxes, an explorer's pack, and 15 gold pieces, or 75 gold pieces to equip yourself.
```

mcp-digest/zai-glm-5.2

```bash
pnpm exec tsx packages/spellkave-design-gen/bin/skgen.js prose generate packages/spellkave-design-gen/samples/barbarian-mcp-digest.prose-manifest.json --confirm-paid --only mcp-digest/zai-glm-5.2 --format text
```

```output
Barbarians are fierce warriors who rely on raw Strength, wielding simple and martial weapons while wearing light or medium armor and shields. They have the largest hit die in the game, a D12 per Barbarian level, and are proficient in Strength and Constitution saving throws, plus two skills from Animal Handling, Athletics, Intimidation, Nature, Perception, and Survival. For starting equipment, choose either a greataxe, four handaxes, an explorer's pack, and 15 gold pieces, or 75 gold pieces to spend as you wish.
```

mcp-digest/zai-glm-5.3

```bash
pnpm exec tsx packages/spellkave-design-gen/bin/skgen.js prose generate packages/spellkave-design-gen/samples/barbarian-mcp-digest.prose-manifest.json --confirm-paid --only mcp-digest/zai-glm-5.3 --format text
```

```output
The Barbarian is a fierce frontline warrior who relies on Strength and has the largest hit die in the game, a d12 per level, making them exceptionally durable. You are proficient with Strength and Constitution saving throws, all simple and martial weapons, light and medium armor, and shields, and you pick two skills from Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival. For starting gear, choose either a greataxe, four handaxes, an explorer's pack, and 15 gold pieces, or 75 gold pieces to spend as you wish.
```
