// Original deliberately faulty starter: Validated and authorized API.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.requests.map(r=>({id:r.id,status:!r.user?401:!x.objects[r.object]?404:200}));
}
