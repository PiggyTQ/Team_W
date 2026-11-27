// Original deliberately faulty starter: Data workbench and API faults.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {rows:x.rows.slice(0,x.pageSize),acceptedResponse:x.responses[0].id};
}
