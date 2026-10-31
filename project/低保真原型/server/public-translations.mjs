import {existsSync,readFileSync} from 'node:fs';
const defaultPath=new URL('./data/public-content-en.json',import.meta.url);
export function createPublicTranslations(path=defaultPath,sitePath=new URL('../src/i18n/site-complete-en.json',import.meta.url)){
  const reviewedPath=new URL('../src/i18n/reviewed-en.json',import.meta.url);
  const entries={...(sitePath&&existsSync(sitePath)?JSON.parse(readFileSync(sitePath,'utf8')):{}),...(existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{}),...(existsSync(reviewedPath)?JSON.parse(readFileSync(reviewedPath,'utf8')):{})};
  const chinese=/[\u3400-\u9fff]/;
  const translate=value=>typeof value==='string'?(entries[value]??entries[value.replaceAll('\r','')]??value):value;
  // Call exclusively on public catalog envelopes. Never on workspace/account responses.
  function envelope(value){
    const publicTranslations={};
    function walk(row){
      if(typeof row==='string'){
        if(chinese.test(row)){const translated=translate(row);if(translated!==row&&!chinese.test(translated))publicTranslations[row]=translated;}
      }else if(row&&typeof row==='object')Object.values(row).forEach(walk);
    }
    walk(value);return {...value,publicTranslations};
  }
  return {translate,envelope};
}
