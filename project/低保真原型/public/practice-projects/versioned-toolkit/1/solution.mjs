// Original deliberately faulty starter: Versioned maintainable toolkit.
// Reproduce the documented counterexample, then correct the implementation.
export function solve(input) {
 const x=structuredClone(input);
 return x.commands.map(c=>({id:c.id,exit:0,stdout:JSON.stringify({cents:Number(c.amount)||0,version:x.version}),stderr:''}));
}
