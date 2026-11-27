// Original deliberately faulty starter: Configuration and acceptance.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.cases.map(c=>({id:c.id,allowed:c.role==='admin',expected:c.expected,passed:c.role==='admin'}));
}
