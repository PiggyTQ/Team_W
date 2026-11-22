export const modes=['guided','debug','independent'];
export function practiceKind(key){return key==='ops:four-signals'?'alert':key==='data:sql-joins'?'sql':key==='testing:decision-tables'?'decision':key==='security:incident-handoff'?'handoff':/(sql|python|html|css|dom-|async-ui|control-flow|unit-tests|structures-cost|atomicity|transform-sql)/.test(key)?'code':'text';}
export const sqlData={guided:{orders:[['A',20],['B',10]],lines:[['A',3],['A',5]]},debug:{orders:[['D',30],['E',15]],lines:[['D',2],['D',4]]},independent:{orders:[['K',50],['L',50],['M',20]],lines:[['K',12],['K',8],['M',5]]}};
export const rawQuery='SELECT o.order_id, o.order_amount,\n       l.line_amount AS line_total\nFROM orders o LEFT JOIN lines l\n  ON l.order_id = o.order_id\nORDER BY o.order_id;';
export const correctedQuery='WITH per_order AS (\n  SELECT order_id, SUM(line_amount) AS line_total\n  FROM lines GROUP BY order_id\n)\nSELECT o.order_id, o.order_amount, p.line_total\nFROM orders o LEFT JOIN per_order p\n  ON p.order_id = o.order_id\nORDER BY o.order_id;';
export function sqlSeed(mode){const d=sqlData[mode];return 'CREATE TABLE orders(order_id TEXT PRIMARY KEY,order_amount INTEGER);CREATE TABLE lines(order_id TEXT,line_amount INTEGER);'+d.orders.map(([k,n])=>`INSERT INTO orders VALUES ('${k}',${n});`).join('')+d.lines.map(([k,n])=>`INSERT INTO lines VALUES ('${k}',${n});`).join('');}
export function checkSqlResult(mode,result){
 const issues=[],d=sqlData[mode],indexes=['order_id','order_amount','line_total'].map(k=>result.columns.indexOf(k));
 if(indexes.includes(-1))return {kind:'sql-output',passed:false,issues:['columns']};
 const rows=result.rows.map(row=>indexes.map(i=>row[i]));
 if(rows.length!==d.orders.length||new Set(rows.map(r=>r[0])).size!==d.orders.length)issues.push('grain');
 for(const [id,amount] of d.orders){const got=rows.find(r=>r[0]===id),ls=d.lines.filter(r=>r[0]===id),total=ls.length?ls.reduce((s,r)=>s+r[1],0):null;if(!got)issues.push('missing-key');else {if(got[1]!==amount)issues.push('order-amount');if(got[2]!==total)issues.push('line-total');}}
 if(result.truncated)issues.push('truncated');
 return {kind:'sql-output',passed:issues.length===0,issues:[...new Set(issues)]};
}
export function decisionConfig(mode){return mode==='independent'?{threshold:80,fee:6}:mode==='debug'?{threshold:60,fee:5}:{threshold:100,fee:8};}
export function checkDecision(mode,fields){const {fee}=decisionConfig(mode),expected=[0,0,0,fee];const issues=expected.flatMap((n,i)=>fields['r'+i]!==String(n)?['r'+i]:[]);if(fields.edge!=='0')issues.push('edge');return {kind:'decision-cases',passed:issues.length===0,issues};}
export function handoffConfig(mode){return mode==='independent'?{alert:'A9',log:'L17',time:'02:00Z',asset:'orders',owner:'值班甲 / Responder A'}:mode==='debug'?{alert:'B4',log:'L28',time:'03:10Z',asset:'H3',owner:'值班乙 / Responder B'}:{alert:'C2',log:'L32',time:'01:20Z',asset:'H1',owner:'值班丙 / Responder C'};}
export function checkHandoff(mode,fields){const c=handoffConfig(mode),issues=['facts','evidence','unknown','actions','owner','update'].filter(k=>!fields[k]?.trim());if(fields.evidence&&!fields.evidence.includes(c.log))issues.push('reference');if(fields.update&&!/(?:^|[T\s])(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s*(?:Z|UTC|\+00:00)/i.test(fields.update))issues.push('timezone');return {kind:'structure-only',passed:issues.length===0,issues};}
export function checkScopeLabel(kind,en=false){return kind==='structure-only'?(en?'Structure/reference check; reasoning remains self-reviewed':'结构与引用检查；判断正确性仍需本人复核'):kind==='sql-output'?(en?'Executed output checked against this dataset':'实际运行输出与本题数据核对'):kind==='decision-cases'?(en?'Actions checked against this rule table':'按本题规则核对组合动作'):(en?'Self-review record':'本人自查记录');}
