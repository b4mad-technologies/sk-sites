@persona:content-author
Feature: Plan catalog images before paying for them
  As a content author with an art manifest or a provider blueprint,
  I want every plan to name the provider route and the expected usage
  without a credential or a provider call,
  so that I know what a confirmed run will cost before I confirm it.

  The scenarios run with no PIXELLAB_SECRET and no OPENAI_API_KEY: a plan
  that reached for a provider would fail, not spend.

  @code:src/cli.ts:runSkgen
  Scenario Outline: <command> plans <planned>, for free
    `skgen image plan` never pays, even when --confirm-paid is passed by
    habit or by a copied command line: only `generate` and `batch` spend.

    Given an image workspace with an art manifest and provider blueprints
    When I run "<command>"
    Then skgen succeeds
    And the last record is an art batch result with no paid call and exactly "<planned>" planned
    And a cost preview names route "/generate-image-pixflux" for each of "<planned>"
    And no image file was written

    Examples:
      | command                                                  | planned            |
      | skgen image plan art.json                                | sprite-1, sprite-2 |
      | skgen image plan art.json --only sprite-2 --confirm-paid | sprite-2           |

  @code:src/image/pixellab-cli.ts:main @code:src/image/openai-image-cli.ts:main
  Scenario Outline: <command> plans a dry run without a credential
    Given an image workspace with an art manifest and provider blueprints
    When I run "<command>"
    Then skgen succeeds
    And its plan makes no paid call, asks for --confirm-paid and says <plan says>

    Examples:
      | command                                       | plan says                                                                                                                                  |
      | skgen image pixellab plan pixellab.json       | {"id":"woven-test","route":"/generate-image-pixflux","estimated_usage":{"type":"generations","generations":1},"sdk":{"patch":"patches/@pixellab-code__pixellab@1.0.2.patch"}} |
      | skgen image pixellab plan-ui pixellab-ui.json | {"id":"woven-ui-test","route":"/create-ui-asset","estimated_usage":{"type":"provider-priced-pro-job","jobs":1}}                            |
      | skgen image pixellab audit-entity-art         | {"kind":"pixellab_entity_art_audit_plan"}                                                                                                  |
      | skgen image pixellab generate-pilot           | {"kind":"pixellab_entity_art_pilot_plan","subjects":24}                                                                                    |
      | skgen image openai-image plan openai.json     | {"id":"woven-test","provider":"OpenAI","model":"gpt-image-2"}                                                                              |
