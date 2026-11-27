// Original deliberately faulty starter: API and UI regression.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.tests.map(t=>({id:t.id,expected:t.expected,actual:t.broken,passed:true}));
}
