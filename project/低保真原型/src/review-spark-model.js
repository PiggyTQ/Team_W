export const reviewCues=[
 {id:'keep',title:'有效做法',scene:'虚构演示 · 一次课程练习',question:{result:'哪些做法有效？取得了什么结果？',reason:'这些做法为什么有效？哪些原因还需核对？',next:'下次准备沿用哪些做法？'},hint:{result:'记录具体行动、产物和本人负责的部分。',reason:'说明方法、材料或协作对结果的影响；尚未验证的解释标为推测。',next:'写清在什么情况下再用这个办法，以及怎样观察它是否有用。'},example:{result:'练习前，我先列出了需要检查的字段，后面可以逐项核对。',reason:'清单可能帮我少漏步骤，但还没对照另一种做法。',next:'下次开始前先列检查清单，完成后再看有没有遗漏。'}},
 {id:'stuck',title:'遇到的问题',scene:'虚构演示 · 一个小项目',question:{result:'遇到了什么问题？对结果有什么影响？',reason:'哪些因素导致了问题？哪些还只是猜测？',next:'准备如何解决这个问题？'},hint:{result:'记录问题发生的环节、具体表现和未完成的内容。',reason:'检查输入、方法、任务范围和协作，说明具体影响因素。',next:'写明具体调整及验证方式，实施后的效果另行记录。'},example:{result:'我直接开始做图，后来发现字段含义没有弄清，只能返工。',reason:'开始前没有核对字段说明；其他影响还不确定。',next:'下次先写出字段含义和疑问，核对后再开始做图。'}},
 {id:'feedback',title:'外部反馈',scene:'虚构演示 · 一次作品交流',question:{result:'收到了哪些反馈？对应哪些工作或产物？',reason:'反馈对应哪一处？你的理解还需要确认吗？',next:'准备如何处理反馈？怎样检查调整效果？'},hint:{result:'在反馈栏保留明确原话，没有收到的部分留空。',reason:'把对方的反馈与你自己的解释分开，不替对方猜测。',next:'明确要处理的反馈、修改内容和复查方式。'},example:{result:'展示作品后，对方说“看不出这张图想回答什么”。',reason:'我没有说明图表要回答的问题；是否还有其他原因，需要再问。',next:'下次先说明问题和图表用途，再请对方看看是否清楚。'}}
];
export const reviewCue=id=>reviewCues.find(x=>x.id===id)||reviewCues[0];
export const reviewPrompt=(id,step)=>{const cue=reviewCue(id),key=['result','reason','next'].includes(step)?step:'result';return {question:cue.question[key],hint:cue.hint[key],example:cue.example[key]};};
