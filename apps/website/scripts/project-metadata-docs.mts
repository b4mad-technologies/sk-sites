#!/usr/bin/env tsx
import { mergeMarkdownDocsRoots } from "../src/compendium/project-authoring-docs.ts";
import { projectMetadataDocsIndex } from "../src/compendium/project-metadata-docs.ts";
import { DOCS_INDEX_PATH, DOCS_PROJECTION_ROOTS, MARKDOWN_DOCS_ROOTS } from "./metadata-docs-registry.mts";

projectMetadataDocsIndex(DOCS_PROJECTION_ROOTS, DOCS_INDEX_PATH);
const index = mergeMarkdownDocsRoots(DOCS_INDEX_PATH, MARKDOWN_DOCS_ROOTS);
console.log(`metadata docs: projected ${index.pages.length} page(s) → ${DOCS_INDEX_PATH}`);
