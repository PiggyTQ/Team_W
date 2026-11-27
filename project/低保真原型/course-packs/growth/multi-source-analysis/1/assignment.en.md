# Multi-source business analysis

The activity owner needs an order and payment reconciliation. Aggregate payments at order grain before joining; distinguish orders, paid amounts and unpaid orders.

## Materials and workflow
Read input/fixture.json with input/dictionary.md. Implement the required source/configuration, run verify.mjs locally, inspect failures, revise and keep the output. Open RUN.md for exact commands. Reference files are published teaching answers, separate from your starter.

## Deliverable contract
- result.json
- notes.md
- query.sql

The result file contains the complete per-ID output, not a prose success claim. notes.md must explain the problem, decision, result locations, limitations, contribution and assistance. Download and run the local package before uploading results.
## Check and review
- Reconcile the complete result with the supplied input IDs and values.
- Duplicating the order amount for each payment inflates the first order. This is a blocking regression.
- Locate the decision and supporting input/result in your deliverables.
- Explain remaining uncertainty, your contribution and what the receiving role must verify.
## Scope and next
These public fixtures and references teach a bounded task; passing them does not certify independent mastery. See next projects and precise skill links in the workspace.

