// One authored offline exercise, shared by both processing methods.
export const atlasCase={
 id:'data-quality-v1',filename:'career-atlas-practice-orders.csv',
 columns:['record_id','group_name','amount'],
 rows:[['R001','A','120'],['R002','A','80'],['R002','A','80'],['R003','B',''],['R004','B','200'],['R005','B','0']]
};
export const atlasCSV=()=>[atlasCase.columns,...atlasCase.rows].map(row=>row.join(',')).join('\r\n')+'\r\n';
export const atlasToolContent={
 sql:{name:'SQL',title:'用 SQL 检查这份数据',description:'把 CSV 按文本列导入名为 practice_orders 的练习表，再检查重复与金额空白。',
  steps:['导入数据后先核对 6 行原始记录，不直接删除或改写。','运行或手工推演下面的查询，记录重复编号和金额空白。','说明保留或处理原值的理由，再写出结论不能支持什么。'],
  label:'SQL 示例（可复制）',copyLabel:'复制 SQL 示例',
  snippet:"SELECT record_id, COUNT(*) AS copies\nFROM practice_orders\nGROUP BY record_id\nHAVING COUNT(*) > 1;\n\nSELECT record_id, amount\nFROM practice_orders\nWHERE amount IS NULL OR amount = '';"},
 sheet:{name:'表格工具',title:'用表格检查这份数据',description:'用自己已有的表格软件打开 CSV，保留原表，在新列中标记问题。',
  steps:['打开 CSV，确认编号在 A 列、金额在 C 列，共 6 行数据。','在 D2 输入重复标记公式并填充到 D7；用空白计数公式检查金额。','记录问题清单、处理理由和局限；金额 0 与空白分开处理。'],
  label:'表格公式示例（可复制）',copyLabel:'复制表格公式',
  snippet:'=COUNTIF($A$2:$A$7,A2)>1\n\n=COUNTBLANK($C$2:$C$7)'}
};
