// Original deliberately faulty starter: Application authorization retest.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.requests.map(r=>({id:r.id,status:r.user?200:401}));
}
