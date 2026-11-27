// Original deliberately faulty starter: Registration service collaboration.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {contract:x.contract.version,accepted:x.calls.map(c=>c.id),feedback:[],revision:x.revision,registrationCount:x.calls.length};
}
