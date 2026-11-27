// Original deliberately faulty starter: Migration launch collaboration.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {reconciliation:{normalized:x.target,differences:[],rollbackAllowed:true,preserve:[]},decision:'rollback_available',feedback:null,revision:x.revision};
}
