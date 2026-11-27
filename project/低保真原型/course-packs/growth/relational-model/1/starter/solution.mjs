// Original deliberately faulty starter: Reproducible relational model.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {customers:x.customers.filter(c=>x.orders.some(o=>o.customer===c.id)).map(c=>({id:c.id,orders:x.orders.filter(o=>o.customer===c.id).length,cents:x.orders.filter(o=>o.customer===c.id).reduce((n,o)=>n+o.cents,0)})),orphans:[]};
}
