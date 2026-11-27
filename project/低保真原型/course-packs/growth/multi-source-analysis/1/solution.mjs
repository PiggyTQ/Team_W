// Original deliberately faulty starter: Multi-source business analysis.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.orders.flatMap(o=>x.payments.filter(p=>p.order===o.id).map(p=>({id:o.id,channel:o.channel,ordered:o.cents,paid:p.cents})));
}
