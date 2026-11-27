// Original deliberately faulty starter: Data contract evolution.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {rows:[...x.history,...x.increment].map(r=>({id:r.id,cents:r.cents??null,origin:'v2'})),missing:[],publish:true};
}
