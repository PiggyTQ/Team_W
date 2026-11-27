# Migration launch collaboration

Rotate business, engineering/operations and UAT roles. Compare normalized content, preserve post-cutover changes and document rollback boundaries.

## Materials and workflow
Read input/fixture.json with input/dictionary.md. Implement the required source/configuration, run verify.mjs locally, inspect failures, revise and keep the output. Open RUN.md for exact commands. Reference files are published teaching answers, separate from your starter.

## Deliverable contract
- result.json
- notes.md
- handoff.json
- solution.mjs
- stage-1.json
- stage-2.json
- stage-3.json

The result file contains the complete per-ID output, not a prose success claim. notes.md must explain the problem, decision, result locations, limitations, contribution and assistance. Download and run the local package before uploading results.
## Check and review
- Reconcile the complete result with the supplied input IDs and values.
- A rollback that discards the new records must be blocked. This is a blocking regression.
- Locate the decision and supporting input/result in your deliverables.
- Explain remaining uncertainty, your contribution and what the receiving role must verify.
## Scope and next
These public fixtures and references teach a bounded task; passing them does not certify independent mastery. See next projects and precise skill links in the workspace.

Consume each input/handoff-N.json as the next simulated role; record the supplied issue, your actual correction, consumer acceptance and remaining risk in handoff.json. These are simulated role handoffs, not real colleagues.
