// Original deliberately faulty starter: Alert rules and counterexamples.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.windows.map(w=>({minute:w.minute,rate:w.errors/w.requests,firing:w.errors/w.requests>x.rule.threshold,label:x.rule.label}));
}
