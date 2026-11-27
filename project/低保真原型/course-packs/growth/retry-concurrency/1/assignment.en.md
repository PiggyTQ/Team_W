# Retry and concurrent consistency

A booking owner has two seats and retried requests. Preserve idempotency, reject changed payloads under a reused key and avoid overselling or partial commits.

## Materials and workflow
Read input/fixture.json with input/dictionary.md. Implement the required source/configuration, run verify.mjs locally, inspect failures, revise and keep the output. Open RUN.md for exact commands. Reference files are published teaching answers, separate from your starter.

## Deliverable contract
- result.json
- notes.md
- solution.mjs

The result file contains the complete per-ID output, not a prose success claim. notes.md must explain the problem, decision, result locations, limitations, contribution and assistance. Download and run the local package before uploading results.
## Check and review
- Reconcile the complete result with the supplied input IDs and values.
- Replaying a key must not reserve seats twice. This is a blocking regression.
- Locate the decision and supporting input/result in your deliverables.
- Explain remaining uncertainty, your contribution and what the receiving role must verify.
## Scope and next
These public fixtures and references teach a bounded task; passing them does not certify independent mastery. See next projects and precise skill links in the workspace.

