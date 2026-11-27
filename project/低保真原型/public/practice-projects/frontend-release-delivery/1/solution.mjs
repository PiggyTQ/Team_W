// Original deliberately faulty starter: Frontend release delivery.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.routes.map(r=>({path:r.path,restored:true,state:'ready'}));
}
