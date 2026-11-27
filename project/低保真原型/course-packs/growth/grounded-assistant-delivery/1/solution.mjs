// Original deliberately faulty starter: Bounded knowledge assistant delivery.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.questions.map(q=>{const d=x.documents.find(d=>d.id===q.document);return {id:q.id,answer:d?.value??null,citation:d?.id??null};});
}
