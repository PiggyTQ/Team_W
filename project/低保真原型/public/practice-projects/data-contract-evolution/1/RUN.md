# Data contract evolution

Node 24. No packages, account, cloud or paid model are required. Run from this extracted project folder.

1. Read assignment.md and input/dictionary.md.
2. Implement solution.mjs, preserving the exported solve(input) interface.
3. Run node verify.mjs. Its fixed regression compares actual outputs including failed/unknown cases.
4. Use node verify.mjs --reference to reproduce the separately supplied public reference.
5. Save the resulting result.json, actual source files and your notes into the Avemly artifact bundle. Results uploaded from a local machine remain user-reported execution.

Run node run-sql.mjs --reference to reproduce the SQLite query; implement query.sql and run node run-sql.mjs.
Known resource measurements are pending. This small original fixture exercises bounded behaviors, not a real enterprise workload.
