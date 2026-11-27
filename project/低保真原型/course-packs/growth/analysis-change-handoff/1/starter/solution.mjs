// Original deliberately faulty starter: Analysis delivery under change.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.versions.map(v=>({version:v.version,unit:v.unit,count:v.rows.filter(r=>r.status==='active').length,cents:v.rows.filter(r=>r.status==='active').reduce((n,r)=>n+r.amount,0)}));
}
