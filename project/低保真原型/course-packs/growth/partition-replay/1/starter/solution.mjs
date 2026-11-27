// Original deliberately faulty starter: Partition replay and publishing.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {published:[...x.previous,...x.batch],blocked:false,quarantine:[]};
}
