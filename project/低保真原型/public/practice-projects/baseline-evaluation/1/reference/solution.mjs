// Original self-contained reference for baseline-evaluation; public teaching solution.
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
    case 'baseline-evaluation': {
      if (x.train.some(r => x.test.some(t => t.id===r.id))) return {error:'split_overlap'};
      const mean=x.train.reduce((n,r)=>n+r.y,0)/x.train.length;
      return {trainIds:x.train.map(r=>r.id), predictions:x.test.map(r=>({id:r.id,prediction:mean})),mae:x.test.reduce((n,r)=>n+Math.abs(r.y-mean),0)/x.test.length};
    }

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("baseline-evaluation",input);
