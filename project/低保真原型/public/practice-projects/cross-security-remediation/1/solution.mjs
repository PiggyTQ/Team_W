// Original deliberately faulty starter: Security remediation collaboration.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {checks:x.requests.map(r=>({id:r.id,status:r.user?200:401})),feedback:null,revision:x.revision,uiHidingSufficient:true};
}
