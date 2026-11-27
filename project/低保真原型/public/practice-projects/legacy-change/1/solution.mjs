// Original deliberately faulty starter: Legacy change and refactoring.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.calls.map(c=>({id:c.id,cents:(c.member?Math.round(c.cents*95/100):c.cents)-(c.cents>=10000?1000:0),api:c.api}));
}
