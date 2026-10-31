// Version edits can retain a historical snapshot; withdrawal explicitly revokes it.
export function claimSnapshotsUnavailable(state,record){
  const refs=[...(record.claimRefs||[]),...(record.facts||[]),...(record.claimSnapshots||[])];
  const explicit=Object.hasOwn(record,'claimIds')||Object.hasOwn(record,'claimRefs');
  const ids=new Set([...(record.claimIds||[]),...(record.claimRefs||[]).map(ref=>ref.id),...(!explicit?refs.map(ref=>ref.id):[])]);
  return [...ids].some(id=>{
    const current=state.claims.find(claim=>claim.id===id&&claim.status==='已确认');if(!current)return true;
    const versions=refs.filter(ref=>ref.id===id);
    return current.withdrawnThrough>0&&(!versions.length||versions.some(ref=>!ref.version||ref.version<=current.withdrawnThrough));
  });
}
