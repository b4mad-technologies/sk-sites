@persona:content-author
Feature: How skgen answers
  As a content author, or a script or agent that runs skgen for me,
  I want the exit code and the two streams to say what happened,
  so that a run can tell "the text failed hygiene" from "the command was wrong".

  Exit 0 is success, 2 a prose candidate that failed the manifest's hygiene
  gate, 1 anything else: a mistake in the command, a refused paid call or a
  provider failure. Answers are JSON on stdout; errors go to stderr.

  Rule: Help is the usage text on stdout, and it lists every verb

    @code:src/cli.ts:runSkgen @launcher
    Example: asking for help succeeds
      When I run "skgen --help"
      Then skgen succeeds
      And stdout lists every skgen verb
      And stderr is empty

  Rule: A mistake in the command exits 1, says what was wrong, and writes nothing

    @code:src/cli.ts:runSkgen
    Scenario Outline: <command> is refused: <why>
      Given a prose manifest with the backpack and the chest
      And an image workspace with an art manifest and provider blueprints
      When I run "<command>"
      Then skgen exits with 1
      And stdout is empty
      And stderr says "<message>"
      And the workspace is unchanged

      Examples:
        | command                                                                            | why                            | message                                                    |
        | skgen paint prose.json                                                             | an unknown family              | error: unknown family paint                                |
        | skgen prose prompt prose.json --only gear/nope                                     | --only matches no entry        | error: --only gear/nope matched no entries                 |
        | skgen prose ingest prose.json --text-file candidate.txt --author me                | ingest without --only          | error: ingest requires --only                              |
        | skgen prose ingest prose.json --only gear/nope --text-file candidate.txt --author me | ingest of an unknown entry   | error: no entry gear/nope in manifest                      |
        | skgen image generate art.json                                                      | image generation unconfirmed   | error: image generation requires --confirm-paid            |
        | skgen image openai-image generate openai.json                                      | an OpenAI image unconfirmed    | error: refusing paid OpenAI call without --confirm-paid    |
        | skgen image openai-image plan openai-bad-job.json                                  | an OpenAI blueprint's bad job  | error: job must be seamless_material or hero_scene         |
