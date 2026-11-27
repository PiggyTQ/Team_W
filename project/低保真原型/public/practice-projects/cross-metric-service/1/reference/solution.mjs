// Original self-contained reference for cross-metric-service; public teaching solution.
// Original deliberately defective and repaired teaching subjects, not captured production traces.
export const discountSubject=(cents,version)=>{
 const threshold=version==='bug-1'?Math.round(cents/100)*100:cents;
 return threshold>=8000?cents-800:cents;
};
export function testSubject(test){
 switch(test.action){
  case 'read-object':return test.version==='bug-1'?200:!test.user?401:test.owner!==test.user?403:200;
  case 'failed-form':return test.version==='bug-1'?'cleared':test.input;
  case 'register':return typeof test.email==='string'&&test.email.includes('@')?201:422;
  default:throw Error('Unknown teaching test action');
 }
}

function runScenario(id,input){const x=structuredClone(input);switch(id){
    case 'multi-source-analysis': {
      const payments = new Map();
      for (const p of x.payments) payments.set(p.order, (payments.get(p.order) || 0) + p.cents);
      return x.orders.map(o => ({id:o.id, channel:o.channel, ordered:o.cents, paid:payments.get(o.id)||0}));
    }
    case 'cross-metric-service': {
      const totals=runScenario('multi-source-analysis',x);
      return {model:totals,api:{version:x.version,cents:totals.reduce((n,r)=>n+r.ordered,0)},feedback:{to:'engineering',issue:'payment_fanout',order:x.orders[0].id},revision:x.revision};
    }

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("cross-metric-service",input);
