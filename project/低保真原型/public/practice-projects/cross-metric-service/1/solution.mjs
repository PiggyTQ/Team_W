// Original deliberately faulty starter: Metric service collaboration.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 const model=x.orders.flatMap(o=>x.payments.filter(p=>p.order===o.id).map(p=>({id:o.id,channel:o.channel,ordered:o.cents,paid:p.cents})));return {model,api:{version:x.version,cents:model.reduce((n,r)=>n+r.ordered,0)},feedback:null,revision:x.revision};
}
