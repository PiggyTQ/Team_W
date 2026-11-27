// Original deliberately faulty starter: Reliability release drill.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.probes.map(p=>({version:p.version,rate:p.errors/p.requests,recovered:p.errors/p.requests<=x.maxError,rollbackAllowed:true}));
}
