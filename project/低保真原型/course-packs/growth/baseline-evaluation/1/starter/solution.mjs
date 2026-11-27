// Original deliberately faulty starter: Baseline and independent evaluation.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 const mean=[...x.train,...x.test].reduce((n,r)=>n+r.y,0)/(x.train.length+x.test.length);return {trainIds:x.train.map(r=>r.id),predictions:x.test.map(r=>({id:r.id,prediction:mean})),mae:0};
}
