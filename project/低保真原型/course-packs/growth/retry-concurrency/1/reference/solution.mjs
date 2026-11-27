// Original self-contained reference for retry-concurrency; public teaching solution.
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
    case 'retry-concurrency': {
      if(!Number.isInteger(x.capacity)||x.capacity<1||x.requests.some(r=>!r.key||!r.owner||r.quantity<1))return {error:'invalid_booking'};
      let remaining=x.capacity;const seen=new Map();
      const responses=x.requests.map(r=>{if(seen.has(r.key)){const previous=seen.get(r.key);return {id:r.id,status:previous.owner!==r.owner||previous.quantity!==r.quantity?409:previous.status};}const status=r.fail?503:remaining>=r.quantity?201:409;if(status===201)remaining-=r.quantity;seen.set(r.key,{owner:r.owner,quantity:r.quantity,status});return {id:r.id,status};});
      return {remaining,responses,committed:x.capacity-remaining};
    }

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("retry-concurrency",input);
