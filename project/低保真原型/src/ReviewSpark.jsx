import React from 'react';
import {reviewCues,reviewCue} from './review-spark-model';
export function ReviewCuePicker({value,onChange}){
 return <div className="review-cue-picker" role="group" aria-label="选择复盘重点">{reviewCues.map(c=><button type="button" key={c.id} aria-pressed={value===c.id} onClick={()=>onChange(c.id)}>{c.title}</button>)}</div>;
}
export default function ReviewSpark({value,onChange}){
 const cue=reviewCue(value);
 return <section className="review-spark" aria-labelledby="review-spark-title"><header><h3 id="review-spark-title">复盘示例</h3><p>选择复盘重点，查看对应的填写示例。</p></header><ReviewCuePicker value={value} onChange={onChange}/><div className="review-spark-demo" aria-live="polite"><p className="review-example-label">{cue.scene} · 只读示例，不会写入本人记录</p><ol>{[['result','结果与反馈'],['reason','原因分析'],['next','改进措施']].map(([key,label])=><li key={key}><h4>{label}</h4><p>{cue.example[key]}</p></li>)}</ol></div></section>;
}
