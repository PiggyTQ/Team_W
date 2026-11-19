import {readFileSync} from 'node:fs';
import {packRoot, pair as p, source as src, chapter as ch, choice as c, column as col, row, step} from './practice-pack-common.mjs';

const caseURL = 'https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework-case-studies#government-digital-service-improving-pipeline-data-quality';
const framework = 'https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework-guidance';
const dataURL = 'https://www.gov.uk/government/statistical-data-sets/road-safety-open-data';
const original = readFileSync(new URL('quality/dft-source.csv', packRoot), 'utf8').trim().split(/\r?\n/).slice(1).map((line, index) => {
  const [id, date, , speed, vehicles, casualties, severity] = line.split(',');
  return row('Q' + String(index + 1).padStart(2, '0'), id, date, speed, vehicles, casualties, severity);
});
// Deliberate teaching changes. The official sample stays separately downloadable.
const sample = structuredClone(original);
sample[2].cells[2] = '';
sample[6].cells[4] = '-3';
sample[10].cells[1] = '2024-10-08';
sample.push(row('Q17', ...original[1].cells));
sample.push(row('Q18', ...original[9].cells.slice(0, 4), '7', original[9].cells[5]));

export const quality = {
  id: 'quality', version: 2, career: 'data',
  title: p('数据质量小项目', 'Data quality review'),
  brief: p('交通分析组准备发布一份碰撞记录简报。你负责判断这张表能否支持按限速分组的描述统计，并提交一份同事能复算的质量记录。', 'A transport analysis team is preparing a collision brief. Decide whether the table can support summaries by recorded speed limit, and hand over a quality record a colleague can reproduce.'),
  audience: p('使用这份简报的交通分析员和复核人', 'Transport analysts and the reviewer of the brief'),
  outcome: p('质量问题清单、处理口径、分组统计和发布建议', 'Issue register, treatment rules, grouped statistics and a release recommendation'),
  boundary: p('练习源自英国交通部 STATS19 的 16 条公开记录，练习表加入教学改动。样本只含向警方报告的道路伤害碰撞，无法据此比较道路风险。', 'The exercise starts with 16 public STATS19 records from the UK Department for Transport. The working table includes teaching changes. The sample covers reported injury collisions and cannot establish comparative road risk.'),
  interview: p('如果缺失值集中在同一组，你会怎样修改分母，并向业务方说明结果的适用范围？', 'If missing values cluster in one group, how would you change the denominator and explain the scope to the business team?'),
  handoff: p('复核人按行号对照原始摘录、重算分组结果，然后决定能否发布。', 'The reviewer compares row IDs with the source extract, reruns the grouped figures and decides whether to release the brief.'),
  roles: {
    member: {title: p('分析项目成员', 'Analyst'), responsibility: p('检查关键字段、维护问题清单，把需确认的口径交给复核人。', 'Inspect key fields, maintain the issue register and escalate definitions that need approval.')},
    lead: {title: p('数据质量主理人', 'Data quality lead'), responsibility: p('确定发布条件、分派复核职责，并向简报使用方说明结论边界。', 'Set release criteria, assign review responsibility and communicate limitations to the brief’s readers.')}
  },
  sources: [
    src('gds-case', 'case', 'Government Digital Service · GOV.UK', 'Improving pipeline data quality', caseURL, '看多部门表格的字段和口径如何统一，以及为什么要回到数据产生环节。', 'See how the team standardized submissions and agreed upstream changes.'),
    src('gds-guide', 'method', 'Government Data Quality Hub', 'The Government Data Quality Framework: guidance', framework, '用质量行动计划记录问题、影响、责任和后续复查。', 'Use an action plan to record the issue, impact, owner and follow-up.'),
    src('dft-data', 'data', 'UK Department for Transport', 'Road safety open data · Collisions 2024', dataURL, '核对 STATS19 覆盖范围、字段说明和 2024 年碰撞 CSV。', 'Verify the STATS19 coverage, field guide and the 2024 collision CSV.'),
    src('dft-licence', 'data', 'National Data Library · Department for Transport', 'Road Safety Data · Open Government Licence', 'https://www.data.gov.uk/dataset/cb7ae6f0-4be6-4935-9277-47e5ce24a11f/road-safety-data', '核对数据提供方及开放许可。', 'Check the data publisher and the open licence.'),
    src('pandas-missing', 'method', 'pandas project', 'Working with missing data', 'https://pandas.pydata.org/docs/user_guide/missing_data.html', '核对缺失值识别、保留和聚合口径。', 'Check how missing values are detected, retained and aggregated.'),
    src('quality-video', 'video', 'Microsoft Learn', 'How to Analyze and Clean a Dataset', 'https://learn.microsoft.com/en-us/shows/machine-learning-for-beginners/how-to-analyze-and-clean-a-dataset-machine-learning-for-beginners', '可选观看，关注如何在开始分析前检查字段。', 'Optional viewing on inspecting fields before analysis.')
  ],
  reading: [
    ch('数据为什么要先过质量关', 'Why the brief needs a quality gate',
      '英国 Government Digital Service 收到多个部门报送的数字支出表格，遇到字段命名、类型和标识不一致。团队先盘点输入，再与报送部门和使用方约定格式，并把修正放到数据产生环节。这个案例给我们的做法是：先说清谁用数据做什么，再确定哪些问题会妨碍他们的决定。\n\n本项目把这项工作放在一份碰撞统计简报里。使用方要比较样本内各记录限速组的记录数与伤亡人数，不是估算一条道路的危险程度。记录单位是一宗碰撞，不是一名伤亡者。先把目的、记录粒度、范围写在交付物开头。\n\n[阅读 GDS 案例](' + caseURL + ')',
      'The UK Government Digital Service received digital-spending spreadsheets with inconsistent field names, types and identifiers. The team reviewed submissions, agreed formats with producers and users, and moved fixes upstream. In this exercise, start with the reader and the decision before deciding which defects matter.\n\nYour brief compares collision counts and recorded casualties across speed-limit groups in a sample. One row represents a collision. The brief has no exposure denominator for estimating road risk. Put the purpose, unit of analysis and coverage at the beginning.\n\n[Read the GDS case](' + caseURL + ')'),
    ch('识别缺失、无效值和重复', 'Detect missing, invalid and duplicate records',
      '下载原始摘录和练习表，保留两份。以 collision_index 作为候选记录键，把日期解析成统一格式；先检查必填字段、取值范围和同键多行，再决定怎样处理。完全相同的重复记录与同键不同值是两类问题。负数伤亡人数不能进入有效统计，缺失限速也不能凭猜测归组。\n\n写一条可复核的质量记录：练习行号、字段、观察、影响、拟处理、负责人。修正值应能回指原始来源；只有本次教学提供了原始摘录，现实项目可能需要等待上游确认。\n\n[质量行动计划](' + framework + ') · [缺失值处理文档](https://pandas.pydata.org/docs/user_guide/missing_data.html)',
      'Download both the source extract and the working table. Preserve both. Treat collision_index as a candidate record key and normalize the date before checking required fields, ranges and repeated keys. An exact duplicate and a conflicting row need different decisions. A negative casualty count cannot enter a valid total, and a missing speed limit needs evidence before grouping.\n\nRecord the row ID, field, observation, impact, proposed treatment and reviewer. A corrected value needs traceable evidence. This exercise provides the source extract; in real work you may need confirmation from the producer.\n\n[Data quality action planning](' + framework + ') · [pandas missing-data guide](https://pandas.pydata.org/docs/user_guide/missing_data.html)'),
    ch('用可说明的分母重算', 'Recompute with an explicit denominator',
      '记录数、有效数、伤亡总数和平均伤亡人数是不同量。用同一套清洗规则得到分组有效记录数，并用这个数作为组内平均值的分母。复算前先记下对同键冲突、缺失和非法值的处理，不把练习表行数当作碰撞数。\n\n可用表格透视或 SQL GROUP BY。先报告处理前后行数、不能纳入统计的记录和原因，然后给出分组表。限速不同的道路还可能有不同流量和暴露水平；本样本不足以据此比较事故风险，也不代表英国全年。\n\n[STATS19 官方覆盖范围和字段说明](' + dataURL + ')',
      'Collision count, valid-row count, total casualties and mean casualties are different quantities. Use the valid count from the same treatment rules as the denominator for a group mean. Record how you handled conflicting keys, missing values and invalid values before aggregating.\n\nUse a pivot table or SQL GROUP BY. Report the row counts before and after treatment, exclusions and reasons, and then the grouped summary. This selected sample lacks exposure data and cannot estimate comparative road risk or annual UK totals.\n\n[Official STATS19 coverage and field guide](' + dataURL + ')'),
    ch('把分析交给另一个人复核', 'Hand over a reproducible review',
      '交付时附上原始来源、摘录范围、问题清单和可复算的统计口径。把可以确定的处理与要向数据提供者追问的问题分开。比如，你可以报告原始表里某个键只有一条记录；是否让上游修改导出规则，还需要记录负责人和复核日期。\n\n面试可以用“使用方的问题 → 我如何判断 → 交付给谁 → 哪些结论尚不能下”来讲述。保留实际完成的证据和本人贡献，将原案例团队的成果与自己的练习成果分开。\n\n[政府数据质量的沟通与复查指引](' + framework + ')',
      'Hand over the source, sample scope, issue register and reproducible treatment rules. Separate verified treatments from open questions for the producer. You may confirm that the source has one row for a key, while an upstream change still needs an owner and review date.\n\nFor an interview, describe the reader’s question, your decision, your handoff and the remaining limits. Keep evidence of your own contribution and distinguish the original team’s work from your exercise.\n\n[Government data quality guidance](' + framework + ')')
  ],
  dataset: {
    title: p('碰撞记录 · 教学工作表', 'Collision records · working sample'),
    intro: p('每条记录保留练习行号。下载原始摘录核对字段，选择能支撑当前判断的行。空值显示为“缺失”。', 'Each record has an exercise row ID. Compare with the source extract and cite rows that support your decision. A blank cell indicates missing data.'),
    columns: [col('key','碰撞编号','Collision ID'), col('date','日期','Date'), col('speed','限速 mph','Limit mph'), col('vehicles','车辆数','Vehicles'), col('casualties','伤亡人数','Casualties'), col('severity','严重度代码','Severity code')],
    rows: sample
  },
  steps: [
    step('scope', {
      title:p('确认简报口径','Define the brief'), assignment:p('选择简报要回答的问题，写下分析对象、粒度和数据覆盖范围。','Choose the question and record the unit, population and sample coverage.'),
      impact:p('先界定可回答的问题，复核人才能判断后面的统计是否支持发布。','This gives the reviewer a basis for judging whether the analysis supports release.'),
      member:p('向简报使用方确认“碰撞记录数”和“伤亡人数”各自怎么用。','Confirm how the audience will use collision counts and casualty counts.'),
      lead:p('补写本次发布的验收条件，并指定谁复核统计口径。','Add release criteria and identify who will review the definition.'),
      question:p('一行是什么？哪些记录在范围内？什么问题需要额外数据？','What does one row represent, what is in scope, and which question needs more data?'),
      hint:p('先查看官方 STATS19 覆盖范围。按样本描述分组与估算风险需要不同证据。','Start with STATS19 coverage. Describing groups and estimating risk require different evidence.'),
      check:p('写出记录粒度、日期与筛选范围，并标明至少一项不可推断的结论。','Name the row unit, date and selection, plus one conclusion the sample cannot support.'),
      handoff:p('带着确认过的记录粒度进入字段核对。','Use the agreed unit when checking fields.'), minEvidence:0, sourceIds:['gds-case','dft-data'],
      choices:[c('describe','比较样本的分组统计','Compare grouped sample statistics','可按记录限速描述这个样本。先确定有效记录数。','This is supported if you define valid records by group.'),c('risk','判断哪类道路更危险','Estimate which roads are riskier','现有表没有交通暴露分母。请缩小发布结论或写清还需什么数据。','Traffic exposure is missing. Narrow the claim or specify additional data.')]
    }),
    step('evidence', {
      title:p('定位质量问题','Find data quality issues'), assignment:p('筛查同键多行、缺失和非法值。至少引用三条证据，写出影响与处理理由。','Check repeated keys, missing fields and invalid values. Cite at least three rows and explain impact and treatment.'),
      impact:p('每个保留或排除决定都会影响分组结果，行号让同事能查回原表。','Each treatment affects the grouped result. Row IDs make the decision traceable.'),
      member:p('写一份问题清单并引用原始摘录中可核对的值。','Write an issue register and cite values you can verify in the source extract.'),
      lead:p('给问题排优先级，并记录需由数据提供者确认的字段。','Prioritize the issues and record which fields need producer confirmation.'),
      question:p('哪两行有同一个键？它们的值一致吗？还有哪些行会影响统计？','Which rows share a key? Do their values agree? What else could change the summary?'),
      hint:p('按碰撞编号排序，查看相邻同键行。检查限速空值、伤亡人数范围和日期格式，再对照原始摘录。','Sort by collision ID and inspect repeated keys. Check blank speed limits, casualty ranges and date formats against the source.'),
      check:p('同键冲突和完全重复分别说明。每项处理都有证据，原值仍可回查。','Explain conflicts and exact duplicates separately. Keep the original value traceable.'),
      handoff:p('确认哪些行进入统计，再到下一步填写分组分母。','Carry the decisions on included rows into the group calculation.'), minEvidence:3, sourceIds:['gds-guide','dft-data','pandas-missing'],
      choices:[c('source','按原始摘录核对后处理','Resolve against the source extract','来源明确时可复核修正，仍应记录发生过什么。','Source-backed corrections are reproducible if you log each change.'),c('exclude','保留未知并从相关指标排除','Retain unknowns and exclude from affected metrics','这是可解释的口径。写清排除规则和每组有效分母。','This is defensible if you report exclusions and valid denominators.'),c('guess','用 0 填补缺失或异常','Replace missing or invalid values with zero','零是一个观测值，会改变总数与均值。请用原始来源或保留未知。','Zero is an observation and changes the result. Verify the value or retain the unknown.')]
    }),
    step('decision', {
      title:p('重算并判断能否发布','Recompute and decide on release'), assignment:p('写出按限速分组的记录数、有效分母、伤亡总数与均值，说明哪些原始记录影响发布。','Report group counts, valid denominators, casualty totals and means. Explain which rows affect the release.'),
      impact:p('让使用方知道数值怎么得出，以及能用它支持什么决定。','The audience can reproduce the figures and understand which decisions they support.'),
      member:p('用表格或 SQL 做一次复算，把异常排除清单附在数字旁边。','Recompute in a spreadsheet or SQL and attach the exclusions alongside the figures.'),
      lead:p('区分可发布的样本描述和待复核内容，写下你愿意签发的范围。','Separate releasable sample findings from pending issues and define what you would approve.'),
      question:p('填入每组的有效记录数与伤亡合计，再写清均值分母和你的发布决定。','Record the valid counts and casualty totals by group, the mean denominator, and your decision.'),
      hint:p('先固定处理规则，再计算。若按原始摘录校正，三个限速组的有效数加起来应回到摘录的行数。','Fix the treatment rules before calculating. If you reconcile to the source, the three groups should add back to the extract size.'),
      check:p('复核人可以用你的行号、筛选和分母得到同一结果。','A reviewer can reproduce your result using the row IDs, filters and denominator.'),
      handoff:p('把口径、结果和未解决项一起交给复核人。','Pass the definitions, results and unresolved issues to the reviewer.'), minEvidence:2, sourceIds:['gds-guide','dft-data'],
      choices:[c('publish-limited','发布带限制的样本统计','Release a scoped sample summary','写明样本范围、分母及不能外推的理由。','State coverage, denominators and why the findings cannot be generalized.'),c('hold','暂缓发布并追问来源','Hold pending source confirmation','指出待确认的字段、责任人以及收到什么证据后能恢复发布。','Specify the open fields, owner and evidence needed to proceed.'),c('publish-risk','将结果发布为风险排名','Publish a road risk ranking','碰撞数没有交通量分母，也不能控制混杂因素。应改成样本描述。','Counts lack an exposure denominator and confounding controls. Report a sample description.')]
    }),
    step('delivery', {
      title:p('交付与面试表达','Hand over and prepare an interview story'), assignment:p('提交能复算的简报说明。单独记录本人贡献、局限和下一位复核人。','Hand over a reproducible brief. State your contribution, limits and the next reviewer separately.'),
      impact:p('一份有证据的交付物能让面试官追问你的分析取舍。','A traceable deliverable gives an interviewer a concrete analytical decision to explore.'),
      member:p('告诉复核人先看哪两个字段和你的哪项判断。','Point the reviewer to two fields and the decision you made.'),
      lead:p('写清由谁核对、未通过怎么办、上游何时复查。','Identify the reviewer, the response to a failed review and when the producer should recheck.'),
      question:p('给复核人写一段交接，包含结论、复算入口和待确认项。','Write a handoff with the conclusion, reproduction instructions and one open question.'),
      hint:p('面试故事可以围绕一个你没有直接填补的值展开：它为何重要、你如何确认、最后怎样表达。','Build the interview story around one value you did not guess: why it mattered, how you checked it and what you reported.'),
      check:p('交付物区分你亲自做过的检查、开放数据覆盖范围及未验证内容。','Separate the checks you performed, data coverage and unverified points.'),
      handoff:p('扩展范围可复算另一种排除规则，比较它对分母和结论的影响。','For extended scope, recompute under a second exclusion rule and compare denominators and conclusions.'), minEvidence:1, sourceIds:['gds-case','gds-guide'],
      choices:[c('handoff','交给复核人按证据核对','Send for evidence-based review','用明确的复核动作代替泛泛的“已清洗”。','Give a concrete review action rather than simply saying the data was cleaned.'),c('revise','提交待补证据的交接','Hand over with evidence pending','说明什么条件满足后才发布，把不确定性保留在记录里。','Make the release condition explicit and keep the uncertainty visible.')]
    })
  ],
  reference: p('若全部按官方摘录复原，保留 16 宗碰撞。限速 20 mph 有 12 宗与 12 名伤亡，30 mph 有 3 宗与 3 名伤亡，50 mph 有 1 宗与 2 名伤亡。练习表中 Q17 完全重复 Q02，Q18 与 Q10 同键但伤亡人数冲突。Q03 缺限速，Q07 有非法负数，Q11 日期格式不同。采用排除规则会得到不同分母，交付时需写明理由。', 'Reconciling every change to the source gives 16 collisions: 12 collisions and 12 casualties at 20 mph, 3 and 3 at 30 mph, and 1 and 2 at 50 mph. Q17 duplicates Q02. Q18 conflicts with Q10 on casualty count. Q03 has no speed limit, Q07 has a negative count and Q11 uses a different date format. An exclusion policy produces different denominators and needs an explanation.'),
  provenance: JSON.parse(readFileSync(new URL('quality/source-receipt.json', packRoot), 'utf8'))
};
