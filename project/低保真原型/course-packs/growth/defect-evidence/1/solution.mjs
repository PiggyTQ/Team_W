// Original deliberately faulty starter: Reproducible defect evidence.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.cases.map(c=>({id:c.id,expected:c.cents>=8000?c.cents-800:c.cents,observed:c.cents>=8000?c.cents-800:c.cents,reproduced:false}));
}
