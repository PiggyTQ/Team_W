// Original deliberately faulty starter: Rule and conversion tool.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.values.map(v=>({input:v,output:v>=10000?v-1000:v,error:null}));
}
