// Original deliberately faulty starter: Service evolution and migration.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {v1:x.records.map(r=>({id:r.id,total:r.cents})),v2:x.records.map(r=>({id:r.id,totalCents:r.cents,currency:'CNY'})),preservedIds:x.records.map(r=>r.id),invalid:[]};
}
