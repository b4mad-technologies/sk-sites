@persona:content-author
Feature: Generate catalog prose from a manifest
  As a content author with a prose manifest (one entry per catalog card),
  I want skgen to plan for free, spend money only when I confirm, and score
  every candidate against the facts the card must and must not carry,
  so that a run never costs by accident and bad text never passes quietly.

  `--provider fake` answers every entry with one fixed Barbarian paragraph
  ("Primary Ability: Strength. Hit Point Die: D12 per Barbarian level. …
  Greataxe."), so these scenarios run offline and the reply is known.

  @code:src/text/run.ts:planProse
  Scenario Outline: <command> only plans: no paid call, nothing written
    A plan names each entry with its prompt and model, so I see what a
    confirmed run would ask for before it costs anything.

    Given the committed Barbarian prose manifest
    When I run "<command>"
    Then skgen succeeds
    And stdout is a prose plan with no paid call for "srd/class/barbarian" with prompt "flatten" and model "openai/gpt-4o-mini"
    And the workspace is unchanged

    Examples:
      | command                                     |
      | skgen prose plan barbarian.json             |
      | skgen prose generate barbarian.json         |

  @code:src/text/run.ts:generateProse
  Scenario: a confirmed run writes each candidate and its hygiene to run.json
    Given the committed Barbarian prose manifest
    When I run "skgen prose generate barbarian.json --confirm-paid --provider fake"
    Then skgen succeeds
    And "prose-generations/barbarian/run.json" holds 1 cell
    And the cell "srd/class/barbarian" in "prose-generations/barbarian/run.json" has provider "fake", passes hygiene and says "D12"

  @code:src/cli.ts:runSkgen
  Scenario: --format text prints only the model's prose
    Given the committed Barbarian prose manifest
    When I run "skgen prose generate barbarian.json --confirm-paid --provider fake --format text"
    Then skgen succeeds
    And stdout is:
      """
      Primary Ability: Strength. Hit Point Die: D12 per Barbarian level. Saving Throw Proficiencies: Strength and Constitution. Greataxe.
      """

  Rule: A candidate that misses a required fact exits 2, and run.json says which fact

    @code:src/text/score.ts:scoreProse
    Scenario Outline: <verb> of text without "backpack" fails the hygiene gate
      The gate is the same for a model's text and for text written by hand.

      Given a prose manifest with the backpack and the chest
      When I run "<command>"
      Then skgen exits with 2
      And the cell "gear/backpack" in "out/run.json" fails hygiene, missing "backpack"

      Examples:
        | verb     | command                                                                                                   |
        | generate | skgen prose generate prose.json --confirm-paid --provider fake --only gear/backpack                      |
        | ingest   | skgen prose ingest prose.json --only gear/backpack --text-file pack.txt --author agent-session:claude-code |

  Rule: score checks a text without a manifest

    @code:src/text/score.ts:scoreProse
    Scenario Outline: a text <outcome>
      When I run "skgen prose score --text <text> --include Strength,D12 --not Caster"
      Then skgen succeeds
      And stdout is the JSON <answer>

      Examples:
        | outcome                                       | text              | answer                                                        |
        | with every fact and no leak passes            | Strength,D12,axe  | {"pass":true,"missing":[],"leaked":[]}                        |
        | missing facts and leaking vocabulary fails    | Caster-Type:NONE  | {"pass":false,"missing":["Strength","D12"],"leaked":["Caster"]} |
