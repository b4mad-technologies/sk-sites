@persona:coding-agent
Feature: Write catalog prose without a provider credential
  As a coding agent with no model credential,
  I want the exact prompt a paid run would send, and a way to hand my own
  text back into the same run.json under the same hygiene gate,
  so that I can write the prose myself and the record says honestly who wrote it.

  These verbs make no provider call: the scenarios run with no credential
  in the environment.

  @code:src/text/run.ts:promptProse
  Scenario: prompt prints the system and user prompt for every entry
    Given a prose manifest with the backpack and the chest
    When I run "skgen prose prompt prose.json"
    Then skgen succeeds
    And stdout lists the prompts of "gear/backpack" and "gear/chest"
    And the prompt of "gear/backpack" uses "flavor-gear" on "openai/gpt-4o-mini" and its user prompt says "Equipment: Backpack"
    And the prompt of "gear/backpack" carries its identity: display name "Backpack" and srd_text "A backpack holds up to 30 pounds."

  @code:src/cli.ts:runSkgen
  Scenario: prompt --only prints one entry's prompt
    Given a prose manifest with the backpack and the chest
    When I run "skgen prose prompt prose.json --only gear/chest"
    Then skgen succeeds
    And stdout lists the prompts of "gear/chest"

  @code:src/text/prompts.ts:renderPrompt
  Scenario Outline: a <prompt_id> entry's prompt names <name> and frames the card
    One row per prompt template, the complete list the manifest accepts
    (PROMPT_IDS in src/text/manifest.ts): the user prompt names the subject
    and carries its facts, the system prompt says what kind of text to write.

    Given a prose manifest with one "<prompt_id>" entry named "<name>" with the facts <facts>
    When I run "skgen prose prompt prose.json"
    Then skgen succeeds
    And its user prompt says "<user says>"
    And its system prompt says "<system says>"

    Examples:
      | prompt_id         | name               | facts                                                                    | user says                                                         | system says                                   |
      | flatten           | Barbarian          | {"Primary Ability":"Strength","Hit Point Die":"D12 per Barbarian level"} | Flatten the Barbarian Core Traits; Primary Ability: Strength; Hit Point Die: D12 per Barbarian level | player-facing class summaries                 |
      | phb-voice         | Barbarian          | {"Primary Ability":"Strength"}                                           | the Barbarian class chapter; Primary Ability: Strength            | Player's Handbook class chapter               |
      | mcp-digest        | Barbarian          | {"Primary Ability":"Strength"}                                           | 1–3 sentences for Barbarian; Primary Ability: Strength            | MCP item_detail fallback                      |
      | flavor            | Barbarian          | {}                                                                       | Class: Barbarian                                                  | class card                                    |
      | flavor-creature   | Wolf               | {}                                                                       | Creature: Wolf                                                    | bestiary card                                 |
      | flavor-spell      | Fireball           | {"srd_text":"A bright streak flashes."}                                  | Spell: Fireball; A bright streak flashes.                         | srd.text                                      |
      | glyph-spell       | Hold Person        | {"srd_text":"The target is paralyzed."}                                  | Spell: Hold Person; The target is paralyzed.                      | shared style pack; subject line               |
      | flavor-item       | Wand of Fireballs  | {"srd_text":"This wand has 7 charges."}                                  | Magic item: Wand of Fireballs; This wand has 7 charges.           | srd.text                                      |
      | flavor-background | Acolyte            | {}                                                                       | Background: Acolyte                                               | background card                               |
      | flavor-species    | Elf                | {}                                                                       | Species: Elf                                                      | species card                                  |
      | flavor-feat       | Alert              | {"srd_text":"Always watching."}                                          | Feat: Alert; Always watching.                                     | feat card                                     |
      | glyph-feat        | Archery            | {"srd_text":"You gain a bonus to attack rolls."}                         | Feat: Archery; You gain a bonus to attack rolls.                  | a bow, not an archer                          |
      | flavor-gear       | Backpack           | {"srd_text":"A backpack holds up to 30 pounds."}                         | Equipment: Backpack; A backpack holds up to 30 pounds.            | equipment card                                |
      | flavor-resource   | Hit Die            | {"srd_text":"Your class grants a die."}                                  | Resource: Hit Die; Your class grants a die.                       | website resource                              |
      | flavor-subclass   | Champion (Fighter) | {"srd_text":"Champions focus on raw martial prowess."}                   | Subclass: Champion (Fighter); Champions focus on raw martial prowess. | website subclass                          |
      | flavor-rule       | Rage               | {"kind":"action","srd_text":"Enter Rage as a Bonus Action."}             | Kind: action; Name: Rage; Enter Rage as a Bonus Action.           | website rule card                             |

  @code:src/text/run.ts:ingestProse
  Scenario: ingest records my text as an agent-session candidate, never as a model's
    The cell names who wrote it and hashes the exact prompt it answers, so a
    later template change shows as drift; it claims no model, because no
    model call happened.

    Given a prose manifest with the backpack and the chest
    When I run "skgen prose ingest prose.json --only gear/backpack --text-file candidate.txt --author agent-session:claude-code"
    Then skgen succeeds
    And stdout is the run.json that "out/run.json" holds
    And "out/run.json" says via "agent-session" and holds 1 cell
    And the cell "gear/backpack" in "out/run.json" is "A sturdy backpack." by "agent-session:claude-code" with no model and a sha256 prompt hash
    And the cell "gear/backpack" in "out/run.json" passes hygiene

  @code:src/text/run.ts:ingestProse
  Scenario: ingest into an earlier run keeps the other entries' cells
    Given a prose manifest with the backpack and the chest
    And the chest was generated by the fake provider into "out/run.json"
    When I run "skgen prose ingest prose.json --only gear/backpack --text-file candidate.txt --author agent-session:claude-code"
    Then skgen succeeds
    And "out/run.json" says via "mixed" and holds 2 cells
    And the cell "gear/backpack" in "out/run.json" has provider "agent-session"
    And the cell "gear/chest" in "out/run.json" still holds the fake provider's text
