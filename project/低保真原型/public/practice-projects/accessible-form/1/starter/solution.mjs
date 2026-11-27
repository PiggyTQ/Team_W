// Original deliberately faulty starter: Accessible form and state recovery.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.actions.map(a=>({id:a.id,state:a.email?'success':'required',retained:''}));
}
