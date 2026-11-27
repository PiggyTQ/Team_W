import React from 'react';
export default function SkillLearningAlignment({leaf,depth,label,language}){
 const en=language==='en',tx=(z,e)=>en?e:z;
 return <details className="learning-alignment">
  <summary>{tx('检验范围与产物复核','Check scope and artifact review')}</summary>
  <dl>
   <div><dt>{tx('最终检验','Final check')}</dt><dd>{tx('完成独立练习和复核后，可参加情境判断与迁移应用检验。检验覆盖本课指定情境。','Complete the independent task and review to open the scenario and transfer check. It covers the specified lesson scenarios.')}</dd></div>
   <div><dt>{tx('独立练习','Independent task')}</dt><dd>{leaf.id==='four-signals'?tx('计算同窗口错误率，调整规则，复核逐分钟状态，说明噪声、发现延迟与未知范围。','Compute a same-window error rate, adjust a rule, and trace its minute-by-minute states. Explain noise, detection delay and gaps.'):label(depth.practice.task)}</dd></div>
   <div><dt>{tx('复核依据','Review evidence')}</dt><dd>{label(depth.verify)}</dd></div>
  </dl>
 </details>;
}
