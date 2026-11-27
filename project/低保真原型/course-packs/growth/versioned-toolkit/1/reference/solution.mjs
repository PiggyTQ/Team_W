// Original self-contained reference for versioned-toolkit; public teaching solution.
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
    case 'versioned-toolkit':
      return x.commands.map(c=>({id:c.id,exit:c.amount===undefined||!/^\d+$/.test(c.amount)?2:0,stdout:c.amount!==undefined&&/^\d+$/.test(c.amount)?JSON.stringify({cents:Number(c.amount),version:x.version}):'',stderr:c.amount===undefined||!/^\d+$/.test(c.amount)?'Usage: tool <integer cents>':''}));

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("versioned-toolkit",input);
