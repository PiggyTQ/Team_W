// Original deliberately faulty starter: Migration reconciliation.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {normalized:x.source,differences:[],rollbackAllowed:x.source.length===x.target.length,preserve:[]};
}
