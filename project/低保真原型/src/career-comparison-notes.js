import {careers} from './model.js';
const valid=new Set(careers.map(c=>c.id));
export const comparisonNoteKey=ids=>{const sorted=[...new Set(ids)].filter(id=>valid.has(id)).sort();return sorted.length>=2&&sorted.length<=3?sorted.join('+'):null;};
const empty={reason:'',question:'',result:'仍未知',saved:false};
export function comparisonNote(state,ids,version){const key=comparisonNoteKey(ids);return key&&state.comparisonNotes?.[key]||{...empty,careers:key?key.split('+'):[],contentVersion:version};}
export function writeComparisonNote(state,ids,version,patch){const key=comparisonNoteKey(ids);if(!key)return state;return {...state,comparisonNotes:{...state.comparisonNotes,[key]:{...comparisonNote(state,ids,version),...patch}}};}
export const noteBasisChanged=(note,version)=>note.contentVersion!==version&&note.reviewedContentVersion!==version;
export const comparisonReason=(state,ids,version)=>{const note=comparisonNote(state,ids,version);return noteBasisChanged(note,version)?'':note.reason;};
export function normalizeComparisonNotes(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>165)throw TypeError('Invalid comparison notes');
 return Object.fromEntries(Object.entries(value).map(([key,n])=>{
  if(!n||typeof n!=='object'||Array.isArray(n)||Object.keys(n).some(k=>!['careers','contentVersion','reviewedContentVersion','reason','question','result','saved','origin'].includes(k))||!Array.isArray(n.careers)||comparisonNoteKey(n.careers)!==key||n.careers.length!==key.split('+').length||typeof n.contentVersion!=='string'||n.contentVersion.length>100||['reason','question'].some(k=>typeof n[k]!=='string'||n[k].length>6000)||!['仍未知','继续比较','先小范围验证','已有倾向，准备确认'].includes(n.result)||typeof n.saved!=='boolean'||n.reviewedContentVersion!==undefined&&(typeof n.reviewedContentVersion!=='string'||n.reviewedContentVersion.length>100)||n.origin!==undefined&&n.origin!=='legacy_adopted')throw TypeError('Invalid comparison note');
  return [key,{...n,careers:key.split('+')}];
 }));
}
