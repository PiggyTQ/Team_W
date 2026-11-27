// Original deliberately faulty starter: Retry and concurrent consistency.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 let remaining=x.capacity;return {responses:x.requests.map(r=>{remaining-=r.quantity;return {id:r.id,status:201};}),remaining,committed:x.capacity-remaining};
}
