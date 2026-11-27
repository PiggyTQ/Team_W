// Original self-contained reference for partition-replay; public teaching solution.
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
    case 'partition-replay': {
      const invalid=x.batch.filter(r=>!r.id||r.partition!==x.partition);
      if(invalid.length)return {published:x.previous,blocked:true,quarantine:invalid.map(r=>r.id)};
      const rows=[...new Map(x.batch.map(r=>[r.id,r])).values()].sort((a,b)=>a.id.localeCompare(b.id));
      return {published:rows,blocked:false,quarantine:[]};
    }

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("partition-replay",input);
