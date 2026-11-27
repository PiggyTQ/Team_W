// Original deliberately faulty starter: Service incident collaboration.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {checks:x.probes.map(p=>({version:p.version,rate:p.errors/p.requests,recovered:true,rollbackAllowed:true})),feedback:null,revision:x.revision};
}
