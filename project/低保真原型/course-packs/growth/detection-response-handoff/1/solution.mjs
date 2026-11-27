// Original deliberately faulty starter: Detection and response handoff.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {hits:x.events.filter(e=>e.kind==='login-success').map(e=>e.id),falsePositives:[],misses:[],action:'request_session_review'};
}
