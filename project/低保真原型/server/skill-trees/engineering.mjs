import {source, tree, branch, leaf, check} from './definitions.mjs';

const dp = source('Microsoft Learn', 'DP-700 Data Engineering study guide', 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700');
const cs = source('ACM / IEEE-CS / AAAI', 'CS2023 knowledge areas', 'https://csed.acm.org/knowledge-areas/', 'CS2023');
const airflow = source('Apache Airflow', 'Best practices', 'https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html');
const runs = source('Apache Airflow', 'DAG runs and data intervals', 'https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dag-run.html');
const quality = source('dbt Developer Hub', 'Data tests', 'https://docs.getdbt.com/docs/build/data-tests');
const evolve = source('Apache Iceberg', 'Schema and partition evolution', 'https://iceberg.apache.org/docs/latest/evolution/');
const stream = source('Apache Flink', 'Timely stream processing', 'https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/');
const lineage = source('OpenLineage', 'Object model', 'https://openlineage.io/docs/spec/object-model/');
const sql = source('PostgreSQL', 'Table expressions', 'https://www.postgresql.org/docs/current/queries-table-expressions.html');
const star = source('Microsoft Learn', 'Understand star schema', 'https://learn.microsoft.com/en-us/power-bi/guidance/star-schema');
const gov = source('UK Government Data Quality Hub', 'Government Data Quality Framework guidance', 'https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework-guidance');
const exam = source('Microsoft Learn', 'DP-700 Practice Assessment', 'https://learn.microsoft.com/en-us/credentials/certifications/fabric-data-engineer-associate/#practice-for-the-exam');

export default tree('engineering', [dp, cs], [
  branch('modeling', ['数据模型与存储', 'Modeling and storage'], ['确定粒度、连接和分区，让下游能解释数据。', 'Choose grain, joins and partitions so downstream data is interpretable.'], [
    leaf('dataset-grain', ['事实粒度与键', 'Dataset grain and keys'], [star, dp],
      ['先声明一行代表什么，再定义事实与维度键和可加性。', 'Declare what one row represents before choosing fact/dimension keys and additivity.'],
      ['建模订单明细与日汇总两个数据集，标注主键、粒度和不能直接相加的比率。', 'Model order lines and daily aggregates with keys, grains and non-additive ratios.'], [
      check(['一张表每笔订单一行，想表示同订单中的商品金额，先怎样建模？','建立每订单明细一行的事实，并明确明细键','把所有商品金额写入无结构备注','将订单总额复制到每个明细并直接汇总','先定正确事实粒度，避免复制总额。'], ['An order table has one row per order. How do you represent product-level amounts?','Create an order-line fact with an explicit line key','Put every amount in an unstructured note','Repeat order total per line and sum it','Choose the event grain and avoid duplicating order totals.']),
      check(['日均转化率能直接相加得到月转化率吗？','应聚合分子分母后重新计算','可以，把每日百分比直接相加','可以，只需剔除最小日','比率通常不可跨时间直接相加。'], ['How do you calculate a monthly conversion rate from daily rates?','Aggregate their numerators and denominators, then divide','Add daily percentages directly','Exclude the smallest day and add the rest','Ratios generally are not additive across time.'])
    ]),
    leaf('transform-sql', ['SQL 转换与对账', 'SQL transforms and reconciliation'], [sql, quality],
      ['将转换拆为可验证步骤，关联前确认唯一性，聚合前后核对计数和关键金额。', 'Split transformations into verifiable steps. Check key uniqueness before joins and reconcile counts and values across stages.'],
      ['写一条把明细汇总为每日销售的 SQL 草稿，保留取消状态并核对来源和结果的金额。', 'Draft a daily sales transform with cancellation rules and source-to-output amount reconciliation.'], [
      check(['连接后行数暴涨，最先检查什么？','两侧关联键基数和重复情况','把所有金额改成文本','删除查询的日期限制','关联基数变化常造成重复放大。'], ['Row count jumps after a join. What do you check first?','Join-key cardinality and duplicates on both sides','Convert amounts to text','Drop date filters','Unexpected cardinality can multiply rows.']),
      check(['输入 1 万行，去重 300 行，排除 100 行。如何核对？','分别记录处理阶段的计数并检查是否重叠','只确认最终行数小于 1 万','用昨天的总量覆盖今天','分阶段口径和交集影响对账。'], ['There are 10,000 input rows, 300 deduplications and 100 exclusions. How should they be reconciled?','Record counts by stage and check overlap','Check only that output is below 10,000','Overwrite with yesterday’s total','Stage definitions and overlap matter for reconciliation.'])
    ]),
    leaf('partition-evolution', ['分区与模式演进', 'Partitions and schema evolution'], [evolve],
      ['按访问模式选择分区，评估写入分布。模式变化要处理读写兼容和历史数据。', 'Partition for access patterns and consider write distribution. Schema changes need reader/writer and historical compatibility.'],
      ['为按日读取事件表选择分区，并写新增可选字段时的新旧读取预期。', 'Choose a partition for an events table queried by day, and specify old/new behavior for a new optional field.'], [
      check(['大多数查询读取一周数据，合适的首选分区通常是？','按事件日期分区并核对文件大小','按唯一用户 ID 为每人分区','随机分成大量极小文件','与访问条件匹配的分区能减少扫描。'], ['Most reads cover a week of events. What is a reasonable starting partition?','Partition by event date and verify file size','One partition per unique user','Many random tiny files','Aligned partitions can reduce scans.']),
      check(['新增可选字段后，历史文件没有该值。应该怎么验收？','核对旧数据默认读取规则及现有消费者兼容性','把旧字段误读成新字段','认为 schema 变更一定自动填满旧数据','模式演进需考虑不同版本文件的读取。'], ['An optional column was added and historical files lack it. What do you verify?','Defaults for old files and compatibility with existing readers','Read an unrelated old field as the new field','Assume schema changes fill all historical data','Readers must handle files written under older schemas.'])
    ])
  ]),
  branch('batch', ['批处理与编排', 'Batch and orchestration'], ['让任务可重跑、可补数，并在依赖就绪后发布。', 'Make jobs repeatable and backfillable and publish after dependencies are ready.'], [
    leaf('dag-intervals', ['DAG 与数据窗口', 'DAGs and data intervals'], [runs],
      ['把逻辑数据窗口和实际执行时间分开。明确输入就绪条件和任务依赖。', 'Separate logical data windows from execution time. Define readiness and dependencies.'],
      ['画订单日汇总 DAG，标注数据日、依赖、重跑参数和输出分区。', 'Draw a daily order DAG with data date, upstream dependencies, rerun parameters and output partition.'], [
      check(['7 月 2 日凌晨运行处理 7 月 1 日数据。查询应依据什么？','DAG 的逻辑数据窗口','执行机器当前日作为唯一分区键','随机选一个空分区','逻辑窗口固定后才可稳定重跑。'], ['A July 2 early-morning job processes July 1. What drives the filter?','The logical data interval','Only the execution host’s current date','Any empty partition','A fixed interval supports reliable reruns.']),
      check(['两张上游表都需要就绪，汇总任务应怎么配置？','显式依赖两张表对应的就绪任务','只等第一张，另一张由运气决定','每天固定等三秒','依赖应表达实际输入可用条件。'], ['An aggregate needs two upstream tables ready. What should the DAG do?','Depend on readiness for both tables explicitly','Wait for only one','Sleep for three seconds every day','Dependencies should model actual input readiness.'])
    ]),
    leaf('idempotent-batch', ['幂等写入与失败恢复', 'Idempotent batch writes'], [airflow],
      ['给输出固定键或分区；可重试任务应能替换目标或按键合并，避免重复追加。', 'Use stable keys or partitions; retriable tasks should replace or merge without duplicate appends.'],
      ['为日汇总设计写入策略，写出中途失败再重跑后的行数和金额预期。', 'Design daily output writes and expected counts and amounts after a partial failure and rerun.'], [
      check(['重跑昨天任务造成重复行，怎样改？','按数据日原子替换或用稳定键合并','每次先追加再忽略重复','关闭重试并手工补数','幂等重跑对同一输入应有一致结果。'], ['Yesterday’s rerun duplicates rows. What change helps?','Replace the target date atomically or merge by stable key','Append each time and ignore duplicates','Disable retries and backfill by hand','An idempotent replay preserves results for the same input.']),
      check(['中途失败可能已经写了一部分，发布前要保证什么？','下游只看到完整已提交的结果或旧版本','允许下游立即看到残缺结果','只打印成功日志','原子发布避免消费者看到半成品。'], ['A failed run may have written part of the output. What should downstream readers see?','Only a complete committed result or the old version','The partial result immediately','Only a success log','Atomic publishing protects downstream readers from partial output.'])
    ]),
    leaf('backfills', ['补数与依赖恢复', 'Backfill and dependency recovery'], [runs, airflow],
      ['按逻辑窗口补数，限定并发和下游重算范围，记录缺口及对账结果。', 'Backfill logical windows with bounded concurrency and affected downstream rebuilds. Log gaps and reconciliation.'],
      ['为三个漏跑日期拟补数顺序，列出影响下游、资源上限与验证。', 'Plan a backfill of three missed dates with downstream effects, resource limits and checks.'], [
      check(['更正 7 月 1 日明细，依赖当日数据的汇总该怎么做？','重算受影响的汇总窗口并复核，不重复写其他日期','只更新今天汇总','永久丢弃该日汇总','补数需覆盖受影响的依赖和窗口。'], ['July 1 lines are corrected. What happens to dependent aggregates?','Rebuild and check affected windows only','Rebuild today only','Permanently remove that day','Backfills must cover affected dependencies and windows.']),
      check(['大量补数与日常任务共享资源，如何降低影响？','限制并发并观察队列，分批补数','同时启动所有历史任务','直接关闭正常调度直到手工确认','受控并发保护在线工作。'], ['A large backfill shares capacity with routine jobs. How do you limit disruption?','Cap concurrency, monitor queues and backfill in batches','Start all historical jobs together','Disable routine scheduling until manual confirmation','Bounded concurrency protects ongoing work.'])
    ])
  ]),
  branch('streaming', ['流式与增量', 'Streaming and incremental data'], ['对齐事件时间，处理迟到、重复和中断后重放。', 'Use event time and handle late arrivals, duplicates and replay after interruption.'], [
    leaf('event-time', ['事件时间与水位线', 'Event time and watermarks'], [stream],
      ['事件发生时间可能早于到达时间。水位线推进窗口进度，迟到仍需处理策略。', 'Event time can precede arrival. Watermarks advance window progress and late data still needs policy.'],
      ['为 5 分钟订单统计写事件时间窗口，示例说明迟到两分钟和十分钟的处理。', 'Define five-minute event-time windows and handling for events two or ten minutes late.'], [
      check(['08:59 的事件在 09:02 到达，按事件时间的小时窗口归哪？','08:00–09:00','09:00–10:00','总是到达日最后一小时','事件时间窗口依据发生时间。'], ['An 08:59 event arrives at 09:02. Which event-time hour owns it?','08:00–09:00','09:00–10:00','The last hour of the arrival day','Event-time windows use occurrence time.']),
      check(['水位线已超过窗口，迟到数据怎么办？','按设定迟到策略更新、旁路或记录','默认保证永远不会迟到','将旧事件时间改成现在','水位线不是所有事件已经到齐的绝对保证。'], ['A record arrives after the window watermark. How should it be handled?','Apply the configured late-data update, side output or logging policy','Assume late data can never occur','Rewrite event time to now','Watermarks do not guarantee every event has arrived.'])
    ]),
    leaf('dedup-replay', ['重复事件与重放', 'Deduplication and replay'], [stream, airflow],
      ['为事件设置稳定 ID 和明确去重窗口。消费恢复与目标写入需要一起验证。', 'Use stable event IDs and explicit deduplication horizons. Verify consumer recovery together with sink writes.'],
      ['给模拟支付事件写去重键、保留期限和中断重放验收。', 'Define a dedupe key, retention period and interruption/replay check for payment events.'], [
      check(['同一事件被重复投递，最可靠的去重依据是什么？','发布方稳定且唯一的事件 ID','消费进程的到达顺序','每次接收生成的新随机 ID','稳定身份可以在重试间识别同一事件。'], ['What identifies a replayed event most reliably?','A stable unique event ID from the producer','Consumer arrival order','A fresh random ID on each receipt','Stable identity lets retries be recognized.']),
      check(['重放后目标表出现两笔金额，优先核对哪里？','目标端是否幂等以及消费确认和写入的顺序','只检查界面颜色','缩短历史保留后直接忽略','需要检查消费位点与持久写入的交互。'], ['Replay produces two amounts in the sink. What should you inspect?','Sink idempotency and ordering of acknowledgement and writes','Only UI colors','Shorten history retention and ignore it','Check the interaction between consumed offsets and persistent writes.'])
    ]),
    leaf('incremental-validation', ['增量结果与迟到修正', 'Incremental validation and late corrections'], [stream, quality],
      ['比较增量与全量在相同窗口的结果。记录可修正窗口、版本和下游通知。', 'Compare incremental and full results for the same interval. Record correction windows, versions and downstream notification.'],
      ['为晚到订单写一项增量核对，说明哪些分区需要更正和如何与全量对照。', 'Write a late-order check with affected partitions and a full recomputation comparison.'], [
      check(['要确认增量统计正确，选什么基准？','同一数据版本和时间窗的独立全量重算','不同日期的报表截图','上游文件名长度','可比较基准要对齐数据与窗口。'], ['What is a good baseline for validating incremental statistics?','An independent full recomputation for the same version and window','A report screenshot from another day','Source filename length','Comparable checks align data and windows.']),
      check(['一个晚到事件修正昨日结果，怎样让用户理解？','保留修订版本、时间和受影响指标','静默覆盖并删除旧说明','改事件发生日使其归入今天','记录修订使下游能跟踪影响。'], ['A late event corrects yesterday’s aggregate. How should consumers see it?','Record revision, time and affected measures','Overwrite silently and delete prior notes','Change event date to put it in today','Revision history makes downstream effects traceable.'])
    ])
  ]),
  branch('governance', ['质量、血缘与运维', 'Quality, lineage and operations'], ['为下游提供校验、来源和能追踪的问题处理。', 'Give downstream consumers checks, provenance and traceable incident handling.'], [
    leaf('pipeline-tests', ['约束与数据测试', 'Constraints and data tests'], [quality, gov],
      ['明确完整性、唯一性、关系与业务规则，设定何时拦截或告警。', 'Specify completeness, uniqueness, relationships and business rules and decide when to block or warn.'],
      ['为事件 ID、客户键和有效金额编写测试清单，给每项规则定失败处理。', 'Write checks for event ID, customer key and amount, with failure handling for each.'], [
      check(['想发现指向不存在客户的交易，使用哪类测试？','交易客户键与客户维表的关系测试','只测金额非空','按文件名去重','关系测试检查键在目标数据集中是否存在。'], ['Which test finds transactions pointing to missing customers?','A relationship test against the customer dimension','Only a non-null test on amount','Deduplicate file names','Relationship tests check referenced keys exist.']),
      check(['数据质量失败是否都应拦截发布？','按数据用途、严重程度和约定门槛处理','所有失败都忽略','同一条警报自动写成成功','处理等级应跟随用户影响和约定。'], ['Should every data-quality failure block publication?','Decide using use case, severity and agreed thresholds','Ignore all failures','Automatically mark every warning successful','Handling depends on impact and agreed gates.'])
    ]),
    leaf('lineage', ['数据血缘与影响分析', 'Lineage and impact'], [lineage],
      ['把作业、运行、输入与输出数据集连起来，记录版本、来源与影响路径。', 'Link jobs and runs to input and output datasets, preserving version, provenance and impact path.'],
      ['为来源订单、日汇总和仪表板绘制血缘，标注哪次运行和哪些下游受变更影响。', 'Draw lineage for source orders, daily aggregates and a dashboard. Mark a run and consumers affected by change.'], [
      check(['上游字段准备删除，先用血缘回答什么？','哪些下游作业与数据集依赖它','谁的 IDE 界面最常打开','磁盘使用率是否高','影响分析需追踪真实依赖。'], ['What should lineage answer before removing an upstream field?','Which jobs and datasets depend on it','Whose IDE is most often open','Whether disk use is high','Impact analysis follows actual dependencies.']),
      check(['同一作业每天执行，如何定位昨天输出？','查询具体 run 与其输入、输出和数据窗','只看作业名称','把所有运行合为同一条时间记录','区分作业定义和每次运行。'], ['A job runs daily. How do you locate yesterday’s output?','Use the concrete run, its inputs/outputs and data interval','Use only the job name','Combine all runs into one timestamp','Separate the job definition from executions.'])
    ]),
    leaf('freshness-recovery', ['新鲜度与质量事件', 'Freshness and data incidents'], [dp, gov, runs],
      ['把数据到达延迟、任务成功与数据可用性分开，记录影响和复查责任。', 'Separate data arrival, job success and usability; record impact and review ownership.'],
      ['给仪表板上游写延迟告警和停止发布条件，补上补数后验收和通知对象。', 'Write a freshness alert and release-stop rule, with backfill validation and a communication owner.'], [
      check(['任务成功但上游今天没有数据，如何标注？','流程运行成功，数据未达新鲜度要求','所有数据正常','仅报机器内存充足','任务状态不能替代数据可用性。'], ['A job succeeds but today’s upstream data is absent. How should this be recorded?','The job succeeded but data missed the freshness objective','Everything is normal','Only report available memory','Job status cannot stand in for data usability.']),
      check(['修复质量事件后，应先检查什么再通知恢复？','受影响分区通过对账和质量规则，关键下游已更新','仅确认任务显示绿色','删除异常报告后宣布恢复','恢复需要验证实际数据与消费结果。'], ['Before announcing recovery from a quality incident, what do you check?','Affected partitions pass reconciliation and quality checks and key consumers are updated','The task is green only','Delete the issue report and announce recovery','Verify data and downstream outcomes.'])
    ])
  ])
], exam);

