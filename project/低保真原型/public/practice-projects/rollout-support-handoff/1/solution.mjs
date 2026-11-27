// Original deliberately faulty starter: Rollout and support handoff.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {decision:'limited_go',unresolved:[],preserve:[],owner:x.support.owner,training:x.training};
}
