import {source, tree, branch, leaf, check} from './definitions.mjs';

const pl = source('Microsoft Learn', 'PL-300 Data Analyst study guide', 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300');
const pgJoin = source('PostgreSQL', 'Joins between tables', 'https://www.postgresql.org/docs/current/tutorial-join.html');
const pgAgg = source('PostgreSQL', 'Aggregate functions', 'https://www.postgresql.org/docs/current/tutorial-agg.html');
const quality = source('UK Government Data Quality Hub', 'Government Data Quality Framework guidance', 'https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework-guidance');
const nist = source('NIST / SEMATECH', 'Engineering statistics handbook', 'https://www.itl.nist.gov/div898/handbook/');
const charts = source('UK Government Analysis Function', 'Data visualisation: charts', 'https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/');
const star = source('Microsoft Learn', 'Understand star schema', 'https://learn.microsoft.com/en-us/power-bi/guidance/star-schema');
const pivot = source('Microsoft Support', 'Create a PivotTable to analyze worksheet data', 'https://support.microsoft.com/en-us/excel/get-started/create-a-pivottable-to-analyze-worksheet-data');
const exam = source('Microsoft Learn', 'PL-300 Practice Assessment', 'https://learn.microsoft.com/en-us/credentials/certifications/data-analyst-associate/#practice-for-the-exam');

export default tree('data', [pl, quality, nist], [
  branch('metrics', ['指标与取数', 'Metrics and querying'],
    ['把业务问题变成可复算的口径，再关联和汇总数据。', 'Define a reproducible metric, then join and aggregate its data.'], [
    leaf('metric-definition', ['指标口径', 'Metric definition'], [pl],
      ['先写清记录粒度、分子、分母、时间窗口及排除条件。指标改口径要保留版本。', 'Specify grain, numerator, denominator, time window and exclusions. Version any change.'],
      ['为订单团队写一张退款率口径卡。订单和退款分别有时间戳，请写明所用日期、唯一订单键和观察窗口。', 'Write a refund-rate definition card. Orders and refunds each have timestamps. Specify the time basis, order key and observation window.'], [
      check(['要比较各月下单队列的退款率，怎样处理跨月退款？','按下单月归组，并给各队列相同观察窗口','把退款按退款月、分母按下单月后直接相除','把未退款订单从各月分母移除','分子与分母应来自同一队列和一致的观察窗口。'],
        ['How should cross-month refunds be handled for monthly order cohorts?','Group by order month and use the same follow-up window','Divide refunds by refund month by orders placed that month','Remove orders without a refund from each denominator','The numerator and denominator must use the same cohort and follow-up window.']),
      check(['观察期内 80 笔订单，6 笔发生退款，其中两笔各退款两次。按订单计的退款率是？','7.5%','10%','6%','以不同退款订单数 6 除以符合口径的订单数 80。'],
        ['Of 80 orders, 6 were refunded. Two of the six had two refunds. What is the order-level refund rate?','7.5%','10%','6%','Divide 6 distinct refunded orders by 80 eligible orders.'])
    ]),
    leaf('sql-joins', ['SQL 表关联', 'SQL joins'], [pgJoin],
      ['先核对键和关系基数。右侧多行会使左侧记录展开。关联后比较行数和唯一键数量。', 'Check keys and cardinality first. Multiple right-side rows expand a left-side record. Compare rows and distinct keys after joining.'],
      ['设计订单与明细的查询，每笔订单一行且保留无明细的订单。写出关联前的汇总步骤和行数校验。', 'Design a query with one row per order, including orders without lines. Show the pre-aggregation step and a row-count check.'], [
      check(['需要保留无明细订单，同时每单只出现一行。哪种查询适合？','先按订单号汇总明细，再对订单做左关联','先做内关联，再对金额做 DISTINCT','直接左关联明细，再删掉所有空值行','先统一明细的粒度，再用左关联保留无匹配订单。'],
        ['How do you retain orders without lines while returning one row per order?','Aggregate lines by order ID, then left join from orders','Inner join first, then use DISTINCT on amounts','Left join raw lines and drop all rows with nulls','Match the grain before the left join preserves unmatched orders.']),
      check(['A 单有两条明细，B 单没有明细。直接左关联会返回几行？','3 行','2 行','1 行','A 展开成两行，B 仍保留一行，右侧字段为空。'],
        ['Order A has two lines and B has none. How many rows does the raw left join return?','3 rows','2 rows','1 row','A expands to two rows; B remains one row with null line fields.'])
    ]),
    leaf('aggregation', ['分组与汇总', 'Grouping and aggregation'], [pgAgg],
      ['在聚合前筛记录，在聚合后筛分组。比率要先确认有效分母，不能直接平均不同规模组的比率。', 'Filter rows before aggregation and groups after it. Check denominators before combining rates across unequal groups.'],
      ['用两个渠道的订单数与退款数做一张分组表和总计表。注明统计粒度、空值规则，并复算整体退款率。', 'Build channel and overall summaries from order and refund counts. State the grain and null policy and recompute the overall rate.'], [
      check(['要只保留订单数至少 10 的地区，应把条件放在哪里？','GROUP BY 后的 HAVING','聚合前的 WHERE COUNT(*)','只在 ORDER BY 后过滤','HAVING 对聚合后的组应用条件。'],
        ['Where does the condition for at least ten orders per region belong?','HAVING after GROUP BY','WHERE COUNT(*) before aggregation','Only after ORDER BY','HAVING applies a predicate to the aggregated group.']),
      check(['渠道 A 为 2/10，B 为 9/90。合并退款率是多少？','11%','15%','10%','合并分子 11 和分母 100 后计算。'],
        ['Channel A has 2/10 refunds and B has 9/90. What is the combined rate?','11%','15%','10%','Combine 11 refunds and 100 orders before dividing.'])
    ])
  ]),
  branch('quality', ['数据质量', 'Data quality'],
    ['识别异常、保留原值，并把质量检查变成可重复规则。', 'Find defects, preserve raw values and turn quality checks into repeatable rules.'], [
    leaf('missing', ['缺失值与有效分母', 'Missing values and denominators'], [quality, pgAgg],
      ['区分没有记录、无测量值和有效零。为每项指标明确缺失值的排除条件。', 'Distinguish missing records, missing measurements and genuine zeroes. Define exclusion rules per metric.'],
      ['对金额 20、空、0、40 写一份缺失规则，分别报告记录数、有效金额数和有效均值。', 'Write a missing-value policy for amounts 20, blank, 0 and 40. Report row count, valid count and valid mean.'], [
      check(['“尚未报告”与“报告金额为零”应怎样记录？','分别保留缺失标记与数值 0','两者都写 0 便于汇总','两者都删掉以免影响均值','真实零是有效观测，未知值需要保留其未知含义。'],
        ['How should “not yet reported” and “reported zero” be recorded?','Preserve missing and numeric zero separately','Set both to zero for easy aggregation','Drop both to protect the mean','A true zero is an observation. An unknown value remains unknown.']),
      check(['20、空、0、40 的有效值均值是多少？','20','15','30','有效分母是 3，真实零参与计算。'],
        ['What is the mean of the observed values 20, blank, 0 and 40?','20','15','30','There are three observations, including the genuine zero.'])
    ]),
    leaf('duplicate-conflict', ['重复与冲突记录', 'Duplicate and conflicting rows'], [quality, pgJoin],
      ['先定义同一实体的键。完全重复可按规则去重，同键不同值需要溯源和裁决。', 'Define the entity key first. Exact duplicates can be deduplicated by rule. Conflicting records need traceable resolution.'],
      ['按订单号比较四行订单，记录重复、同键不同金额及保留理由。留下可追溯的原行号。', 'Compare four orders by ID. Log exact duplicates, conflicting amounts and the retention rationale with raw row references.'], [
      check(['同一订单号的两行金额不同，又没有可信更新时间。应先怎么处理？','保留两条原行，登记冲突，向权威来源核对','直接保留金额较高的一行','按订单号去重，保留文件第一行','缺少可信裁决规则时保留来源和待核对状态。'],
        ['Two rows share an order ID but disagree on amount, with no reliable timestamp. What comes first?','Preserve both rows, log the conflict and consult the authoritative source','Keep the row with the higher amount','Deduplicate by ID and take the first row','Keep provenance and flag unresolved conflicts until there is a reliable rule.']),
      check(['编号 A 两行完全相同，B 两行金额冲突。仅折叠完全重复后剩几行？','3 行','2 行','4 行','A 折叠为一行，B 的两条原行继续待核对。'],
        ['A appears twice identically and B appears twice with conflicting amounts. How many rows remain after collapsing exact duplicates only?','3 rows','2 rows','4 rows','A collapses to one row and B retains both conflicting records.'])
    ]),
    leaf('quality-rules', ['质量规则与复核', 'Quality rules and review'], [quality],
      ['围绕用途选择完整性、有效性或一致性指标。为规则写清分母、责任人和复查条件。', 'Choose completeness, validity or consistency measures based on use. Specify denominator, owner and review conditions.'],
      ['为一张订单表设计三条规则，并给每条规则写失败示例、负责人、是否影响发布及复查条件。', 'Design three rules for an orders table. Record a failure example, owner, release impact and follow-up condition for each.'], [
      check(['所有邮编都有值，但三条不符合约定格式。哪项有问题？','有效性','完整性','时效性','字段存在衡量完整性。能否满足格式规则属于有效性。'],
        ['Every postcode is present but three violate the expected format. Which dimension fails?','Validity','Completeness','Timeliness','Completeness is presence; adherence to the format is validity.']),
      check(['规则适用于 50 行，4 行失败。失败率是多少？','8%','4%','92%','失败行数 4 除以适用规则的 50 行。'],
        ['A rule applies to 50 rows and 4 fail. What is its failure rate?','8%','4%','92%','Divide 4 failed rows by the 50 rows to which the rule applies.'])
    ])
  ], 'quality'),
  branch('statistics', ['统计判断', 'Statistical reasoning'],
    ['描述分布，辨认样本偏差，并判断证据能支持什么结论。', 'Describe distributions, identify sampling bias and judge what the evidence supports.'], [
    leaf('descriptive', ['描述统计与分布', 'Descriptive statistics'], [nist],
      ['用中位数和分位数补充均值。检查偏态、极端值和单位，并注明样本大小。', 'Complement means with medians and quantiles. Check skew, outliers and units and report sample size.'],
      ['给配送时间 5、6、7、8、60 分钟写两句分析。分别计算均值和中位数，并解释它们为何不同。', 'Summarize delivery times of 5, 6, 7, 8 and 60 minutes. Calculate mean and median and explain the difference.'], [
      check(['右偏配送时长要描述典型用户，应首先补哪项？','中位数与分位数','仅增加均值的小数位数','去掉最慢记录后只报均值','中位数反映位置，分位数描述尾部，不需要先删真实极端值。'],
        ['Which measures help describe typical experience for right-skewed delivery times?','Median and quantiles','More decimal places on the mean','Mean after deleting the slowest case','Median describes location and quantiles describe the tail without deleting real observations.']),
      check(['5、6、7、8、60 的中位数是多少？','7','17.2','8','排序后的五项中第三项是 7。'],
        ['What is the median of 5, 6, 7, 8 and 60?','7','17.2','8','The third of five ordered observations is 7.'])
    ]),
    leaf('sampling', ['抽样与偏差', 'Sampling and bias'], [nist],
      ['说明目标总体、抽样框和未覆盖人群。大样本也无法自动修复选择偏差。', 'Identify the target population, sampling frame and missing groups. A large sample alone cannot fix selection bias.'],
      ['为活跃和流失用户做满意度调查方案，写清邀请渠道、分层方式及非响应会怎样影响结果。', 'Plan a satisfaction survey for active and churned users. Specify recruitment, strata and the effect of non-response.'], [
      check(['只调查登录中的用户，能否推断所有曾注册用户？','不能直接外推，抽样框未覆盖离开用户','可以，只要当前用户样本足够大','可以，报告均值时做四舍五入即可','样本量不能消除抽样框遗漏。'],
        ['Can a survey of logged-in users generalize to everyone who ever registered?','No direct generalization; the frame excludes people who left','Yes if the active sample is large enough','Yes if the mean is rounded','A larger sample does not fix missing coverage.']),
      check(['若需要确保两个小地区都有足够观测，选哪种设计？','按地区分层抽样，汇总时按目标总体加权','只随机抽最大地区','把两地样本量设为相同就直接计算总体均值','分层保证覆盖，汇总权重还需反映总体规模。'],
        ['How can you ensure enough observations from two small regions?','Stratify by region and weight the overall result to population sizes','Sample only the largest region','Use equal regional sample sizes and take the unweighted overall mean','Stratification secures coverage and weighting accounts for population sizes.'])
    ]),
    leaf('experiment', ['实验与因果判断', 'Experiments and causal claims'], [nist],
      ['先定主指标、随机分配单位和分析窗口，再解读效应大小及不确定性。', 'Predefine the primary metric, unit of randomization and analysis window, then interpret effect size and uncertainty.'],
      ['为新结账流程拟一个对照实验。写清如何随机、如何处理重复访问，以及什么结果仍需要更多样本。', 'Plan a checkout experiment. Describe randomization, repeated visits and when more evidence is needed.'], [
      check(['一个用户可能多次访问，怎样保持组间对照？','按用户随机并让同一用户始终留在同组','每次刷新页面就重新随机','让高频用户自行挑选版本','稳定分组避免同一用户跨组接受处理。'],
        ['How should repeated visits be assigned in a checkout experiment?','Randomize by user and keep each user in one group','Randomize again on each refresh','Let frequent users choose the version','Stable assignment keeps the same user from receiving both treatments.']),
      check(['估计效果为 +2 个百分点，置信区间跨过 0。可以怎样汇报？','点估计为正，当前区间仍包含无效应','已经证明新方案一定有提升','已经证明两个方案等效','区间包含 0 时仍有不确定性，等效需要自己的判定条件。'],
        ['The estimated lift is +2 percentage points and the confidence interval crosses zero. What is warranted?','The point estimate is positive and no effect is still compatible with the interval','The new design is proven better','The designs are proven equivalent','An interval crossing zero leaves uncertainty. Equivalence has separate criteria.'])
    ])
  ]),
  branch('communication', ['建模与表达', 'Modeling and communication'],
    ['建立可解释的数据模型，复核汇总口径，再把发现写成可核对的建议。', 'Build an interpretable model, check aggregations and make a verifiable recommendation.'], [
    leaf('star-schema', ['事实表与维度', 'Facts and dimensions'], [star],
      ['先声明事实表粒度，再分离用于筛选或分组的维度。汇总前确认连接不会复制度量。', 'Declare fact-table grain and separate dimensions for filtering or grouping. Check joins before aggregating measures.'],
      ['画一个订单明细事实表和日期、商品维度，标注主键、外键以及金额在哪个粒度计算。', 'Sketch an order-line fact table with date and product dimensions. Mark keys and the grain at which revenue is computed.'], [
      check(['按日和产品汇总销售额时，销售额通常放在哪里？','订单明细事实表，日期与商品属性在维度表','商品维度表，每个商品放一个销售额','日期维度表，每天每个商品复制整份订单','度量依附事件或事实粒度，维度用于分组。'],
        ['Where does revenue normally belong when reporting daily product sales?','In the order-line fact; date and product attributes live in dimensions','In the product dimension as a single amount per product','In the date dimension with each order duplicated across products','A measure belongs at the event grain; dimensions support grouping.']),
      check(['商品维度的商品键重复，连接后首要风险是什么？','事实行被重复匹配，销售额偏高','事实表日期自动改为字符串','聚合结果因维度重复一定偏低','一个事实键匹配多个维度行会放大度量。'],
        ['What is the main risk if product keys are duplicated in the dimension?','Facts match multiple rows and sales are inflated','Fact dates become strings','Aggregates are always lower','Multiple dimension matches can multiply the measure.'])
    ]),
    leaf('pivot-tables', ['表格透视与对账', 'Pivot tables and reconciliation'], [pivot],
      ['透视表按行列字段分组。核对值字段采用求和还是计数，也要确认数据范围和筛选条件。', 'A pivot table groups rows by its row and column fields. Check whether values are summed or counted, and verify the data range and filters.'],
      ['在表格中填入四笔交易（华东 40、华东 60、华南 30、华南 10）。用地区做行字段，分别汇总金额和笔数，与手算核对。', 'Enter four transactions (East 40, East 60, South 30, South 10). Use region as the row field. Summarize amounts and counts, then check both by hand.'], [
      check(['金额字段被透视表默认为计数，应先排查什么？','是否有文本值导致字段被当作文本','地区名称是否按拼音排序','是否需要把行字段移到列字段','先确认金额字段的类型，再选择所需的汇总方式。'],
        ['A pivot table defaults to counting the amount field. What should you check first?','Text values that make the field non-numeric','The alphabetical order of regions','Whether to move the row field to columns','Check the amount field type before choosing an aggregation.']),
      check(['新增交易后，透视表总额仍是旧值。怎样核对？','确认数据源包含新行，刷新后按相同筛选条件对账','更改总计显示格式并保存','直接将旧总计改成期望的数值','源范围和刷新状态都会影响参与计算的行。'],
        ['A new transaction leaves the pivot total unchanged. How do you verify it?','Include the new row in the source, refresh and reconcile with the same filters','Change the total cell format and save','Replace the old total with the expected number','The source range and refresh state control which rows contribute.'])
    ]),
    leaf('chart-choice', ['图表与阅读顺序', 'Charts and reading order'], [charts],
      ['从读者的问题选择编码。比较分类可用条形图，时间趋势用连续时间轴，并给出单位和样本。', 'Choose an encoding for the reader’s question. Use bars for category comparison or a continuous time axis for trends. Label units and sample.'],
      ['把六个月退货率做成趋势图草稿，再为四地区的同月比较选一种图。写标题、轴单位和数据说明。', 'Sketch a six-month return-rate trend and a same-month regional comparison. Write titles, units and data notes.'], [
      check(['要比较五个地区同月的订单数，优先选择什么？','带同一零点基线的条形图','把五个地区当时间点的折线图','只保留排序后的五个扇区且省略标签','分类大小用共享基线便于比较。'],
        ['What is a good default for comparing order counts across five regions in one month?','A bar chart with a common zero baseline','A line chart treating regions as time points','Five sorted pie slices with no labels','A common baseline makes category size easy to compare.']),
      check(['4 月缺记录，趋势图怎样处理？','显示缺口并说明缺测','填 0 后画连续折线','删掉 4 月并保持各点等距','保留时间间距并区分缺测与零。'],
        ['April is missing from a trend series. How should it appear?','Show a gap and note the missing period','Fill in zero and draw an unbroken line','Delete April and keep all points equally spaced','Keep time spacing and distinguish missing from zero.'])
    ]),
    leaf('decision-brief', ['分析简报与限制', 'Decision brief and limitations'], [charts, quality],
      ['先给结论和证据，再交代范围、替代解释与下一步。把观察、推测和决策分开表达。', 'Lead with the finding and evidence, then give scope, alternative explanations and next actions. Separate observation from interpretation.'],
      ['为配送负责人写四句简报，分别写观察、证据、限制和一个可检验的后续动作。', 'Write a four-sentence brief for delivery operations: observation, evidence, limitation and a testable follow-up.'], [
      check(['上线后退货率下降，但同期商品结构变化。简报怎么写？','说明观察到的变化，并建议按商品结构复核','直接把下降归因于上线','只报商品结构变化，不写实际退货率','观察支持描述，因果解释要处理同期变化。'],
        ['Returns fell after a launch while the product mix also changed. What belongs in the brief?','Report the change and recommend checking product mix','Attribute the entire change to the launch','Report product mix and omit the observed return rate','The observation supports description; causal interpretation needs the concurrent change addressed.']),
      check(['能让同事复算的一组最小信息是什么？','数据范围、版本、指标定义和查询或处理步骤','图表截图和结论标题','分析人的经验和系统名称','复算需要同一输入范围和明确计算步骤。'],
        ['What minimum information lets a colleague reproduce the result?','Data scope and version, metric definition and query or processing steps','A chart screenshot and headline','The analyst’s experience and system name','Reproduction requires the input scope and calculation steps.'])
    ])
  ])
], exam);

