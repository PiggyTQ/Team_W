// Original self-contained reference for cross-knowledge-assistant; public teaching solution.
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
    case 'grounded-assistant-delivery':
      return x.questions.map(q=>{const d=x.documents.find(d=>d.id===q.document&&d.roles.includes(q.role));return {id:q.id,answer:d&&d.version===q.version&&d.fact===q.fact?d.value:null,citation:d&&d.version===q.version&&d.fact===q.fact?d.id:null};});
    case 'cross-knowledge-assistant':
      return {answers:runScenario('grounded-assistant-delivery',x),feedback:{to:'security',issue:'private_document_must_be_rejected'},revision:x.revision};

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("cross-knowledge-assistant",input);
