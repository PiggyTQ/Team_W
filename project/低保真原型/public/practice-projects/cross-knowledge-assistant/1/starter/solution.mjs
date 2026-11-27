// Original deliberately faulty starter: Knowledge assistant collaboration.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return {answers:x.questions.map(q=>({id:q.id,answer:x.documents.find(d=>d.id===q.document)?.value,citation:q.document})),feedback:null,revision:x.revision};
}
