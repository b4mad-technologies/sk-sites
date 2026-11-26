# Prose samples (showboat)

Readable bake-offs for `skgen prose`. Each document is a [Showboat](https://pypi.org/project/showboat/)
file: the prompt, then the `skgen` command, then the captured model text.

Live re-exec is paid (`--confirm-paid`). Do not run `uvx showboat verify` in CI.

```bash
uvx showboat init packages/spellkave-design-gen/samples/<name>.md "<title>"
uvx showboat note packages/spellkave-design-gen/samples/<name>.md < prompt.txt
uvx showboat --workdir "$PWD" exec packages/spellkave-design-gen/samples/<name>.md bash \
  'just skgen prose generate packages/spellkave-design-gen/samples/<name>.prose-manifest.json --confirm-paid --only <id> --format text'
```
