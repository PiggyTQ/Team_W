import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import {sqlSeed} from './skill-practice-tasks.js';
self.onmessage=async({data})=>{
 let db;
 try{
  const query=String(data.query||'');
  if(query.length>7500||!/^\s*(?:SELECT|WITH)\b/i.test(query)||/\b(?:PRAGMA|ATTACH|DETACH|load_extension|readfile|writefile)\b/i.test(query))throw new Error('READ_QUERY_ONLY');
  const SQL=await initSqlJs({locateFile:()=>wasmUrl});db=new SQL.Database();
  db.exec(sqlSeed(data.mode));db.exec('PRAGMA hard_heap_limit=16777216; PRAGMA query_only=ON;');
  let output,count=0;
  for(const statement of db.iterateStatements(query)){
   if(++count>1)throw new Error('ONE_QUERY_ONLY');
   const columns=statement.getColumnNames(),rows=[];
   while(statement.step()){if(rows.length===100){output={columns,rows,truncated:true};break;}rows.push(statement.get());}
   output||={columns,rows,truncated:false};
  }
  if(!output)throw new Error('EMPTY_QUERY');
  self.postMessage({ok:true,...output,engine:'SQLite '+db.exec('select sqlite_version()')[0].values[0][0]});
 }catch(error){self.postMessage({ok:false,error:String(error.message).slice(0,300)});}finally{db?.close();}
};
