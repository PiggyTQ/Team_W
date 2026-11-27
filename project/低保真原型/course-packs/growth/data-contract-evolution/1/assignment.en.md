# Data contract evolution

A downstream analyst needs historical and incremental data after an amount-field rename. Normalize both forms and block missing required values.

## Materials and workflow
Read input/fixture.json with input/dictionary.md. Implement the required source/configuration, run verify.mjs locally, inspect failures, revise and keep the output. Open RUN.md for exact commands. Reference files are published teaching answers, separate from your starter.

## Deliverable contract
- result.json
- notes.md
- query.sql

The result file contains the complete per-ID output, not a prose success claim. notes.md must explain the problem, decision, result locations, limitations, contribution and assistance. Download and run the local package before uploading results.
## Check and review
- Reconcile the complete result with the supplied input IDs and values.
- Using only the new field loses historical amounts. This is a blocking regression.
- Locate the decision and supporting input/result in your deliverables.
- Explain remaining uncertainty, your contribution and what the receiving role must verify.
## Scope and next
These public fixtures and references teach a bounded task; passing them does not certify independent mastery. See next projects and precise skill links in the workspace.

