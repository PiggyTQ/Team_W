# Data / AI / Engineering 教学内容交叉审阅

日期：2026-11-27。范围：抽查 `src/skill-teaching/data-ai.json` 中 12 课，覆盖 data、engineering、ai 各 4 课。本轮读取教学正文、完整示范、微练习与迁移题，并独立复算；没有以字数或 JSON 结构代替内容质量判断。

## 发现并修正的问题

1. **7 天退款率给定不完整。** 原例只说订单成熟及发生退款，没有退款发生时点，无法判断退款是否属于前 7 天。现在给出 A 第 2/5 天、C 第 6 天、B 第 9 天，明确先筛事件时间，再按订单去重；结果区分窗口内 3 次事件、窗口外 1 次、2/4=50% 的订单率。微练习与迁移题也补齐发生窗口。
2. **HAVING 示例的输入粒度不明。** 原例直接使用 COUNT(*)>=50，若读者把给定 A/B 两行当输入，就会数成渠道行数。现在明确原始表一行一订单、refunded 为 0/1，并解释已经汇总成一行一渠道时应按 orders 列筛选，不能再把 COUNT(*)当订单量。
3. **离线评估量与日处理容量被混用。** 原例拿固定评估样本的 12/7 次提醒对比每日容量 7 次，却没有说明样本代表一天。现在容量明确为“同一批样本的最多 7 次复查”，并说明不能直接把离线计数当每日流量。
4. **RAG 双语适用日不完全一致、出处过宽。** 中文“6 月 30 日前”与英文“7 月 1 日前”对 6 月 30 日不等价。现在统一为 7 月 1 日之前；显式给出日期差的课内计日规则。来源细化到已读 Microsoft 第 15 课和官方 RAG/grounding 页面，而非只给仓库首页。

上述修改仅落在这 4 课的相关字段，未修改 UI、既有成果检验或评分规则。

## 12 课逐项审阅

| 课程 | 实质审阅结果 |
| --- | --- |
| data:metric-definition | 修复给定不足。现在能按事件时点、成熟队列和实体去重独立复算；并用第 9 天退款说明“成熟”不等于所有后续退款都可进 7 天分子。 |
| data:sql-joins | 概念与演算成立：直接左连接产生 A 两行、B 一行，订单金额误成 190；先聚合明细后回到 2 行、110。两个 50 的 DISTINCT 反例明确说明按值去重不能代替订单去重。ON/WHERE 的未匹配行结论正确。 |
| data:aggregation | 修复粒度前提。2/20、16/80 合计 18/100=18%，等权均值 15%不成立；筛后 B=20%。不同统计集合被明确命名。 |
| data:experiment | 100/1000→130/1000 为 3 个百分点、相对 30%；微练习 40/400→48/400 为 2 个百分点、相对 20%。没有把算术差异直接宣称为未来稳定因果效果。该课教效应表达与实验前提，**没有教会置信区间或显著性计算**，不得据此宣称完整掌握实验分析。 |
| engineering:dag-intervals | 执行时刻与逻辑数据窗口明确区分，半开区间的终点归下一个窗口。没有把某个触发时刻当作固定的数据区间语义；保留版本/timetable限制。 |
| engineering:event-time | 事件归窗与迟到接收策略分离。10:02/10:03 均归原窗口；10:07与10:12是否更正按明确教学截止处理。**这里的固定到达截止是自定义教学策略，不是 Beam allowed-lateness API 的等价配置**；当前文字已标明，不应照抄成引擎实现。 |
| engineering:incremental-validation | 新增 +40、修改 +5、删除 −10，60→95；键集合变为 B/C/D，三实体。对账包含逐键而非只总额。微练习与迁移分别复算 12、27，答案唯一。 |
| engineering:idempotent-batch | 定义面向外部可见结果；暂存部分失败与发布提交分开，未把“日志成功”当幂等。使用事务/元数据切换的前提是目标存储支持，未声称任意目录改名都有原子性。这里是方案推演，未执行真实存储系统。 |
| ai:split-leakage | 训练均值 3 与全数据均值 35.33 说明预处理也会泄漏；微练习 15 正确，另两项分别用了测试值或测试集本身。迁移要求实体与时间约束，并承认微小样本不足以证明泛化。 |
| ai:metric-tradeoff | T1 精确率 66.67%/召回 80%，T2 为 85.71%/60%，并保留复查量。修复容量比较的时间尺度；微练习 75%/60%及迁移 60%/80%、90%/60%成立。 |
| ai:retrieval-grounding | 修复双语日期边界并细化来源。适用 P2，15>14，结论只覆盖给定普通期限；无证例外保持未知，未把检索相似度当主张支持或授权。微练习只有“期限已知、例外未证实”可由资料推出。 |
| ai:monitoring | 组内 10%/40%保持不变、复杂组占比 10%→50%，整体 13%→25%正确；该合成例的构成变化足以解释描述性总值变化。没有无标签却计算错误率，也没有因组内稳定而否认整体体验变差。 |

这 12 课已有可自足复算的输入、中间推理与反例，确实提供了可学习的小概念。它们的完成范围是本课明示概念；不因阅读、选择一次或填写开放题就推断用户已经熟练掌握全部职业技能。

## 一手资料交叉核对

- [PostgreSQL Table Expressions](https://www.postgresql.org/docs/current/queries-table-expressions.html)：连接行对、LEFT JOIN 未匹配行、WHERE 与 HAVING 的阶段。SQL 小夹具独立执行，未依赖文案自证。
- [NIST Completely Randomized Designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri331.htm)：处理水平随机分配到实验单位的设计前提；课内比例运算为独立复算，不冒称该页面对具体 A/B 数据给出统计推断。
- [Government Data Quality Framework guidance](https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework-guidance)：按用途制定测量规则、保存元数据和解释质量限制。退款数据及 7 天合同为原创合成例，并非 GOV.UK 发布的退款数据或政策。
- [Airflow Dag Runs](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dag-run.html)、[Best Practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)：逻辑窗口、重跑一致性与任务幂等原则。没有把所读文档版本当作项目已安装版本。
- [Beam Programming Guide: watermarks and late data](https://beam.apache.org/documentation/programming-guide/#watermarks-and-late-data)：事件时间/处理时间、水位线和迟到处理；课内绝对截止策略与引擎水位线机制保持区别。
- [dbt Data Tests](https://docs.getdbt.com/docs/build/data-tests)：数据断言与失败记录；本例增量状态演算是原创，与具体数据库 CDC/合并实现分开。
- [scikit-learn Common Pitfalls](https://scikit-learn.org/stable/common_pitfalls.html)：切分之后再拟合预处理，fit 只使用训练数据。
- [scikit-learn Model Evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html)：精确率、召回率及阈值评估；人工容量必须在同一业务量口径内比较。
- [Microsoft 第 15 课](https://github.com/microsoft/generative-ai-for-beginners/blob/main/15-rag-and-vector-databases/README.md)、[Microsoft RAG and indexes](https://learn.microsoft.com/en-us/azure/foundry/concepts/retrieval-augmented-generation)：检索数据参与 grounding、引用信息与证据定位。政策日期案例为原创，未引用真实法律或商家规则。

## 验证范围

临时独立 Python/SQLite 校核已运行通过：JOIN金额放大/修复、相同金额 DISTINCT 反例、原始订单表 HAVING、退款时点筛选、效应尺度、增量状态、训练均值、分类指标、用户结构变化和政策日期差。SQLite只用于这些共同 SQL 语义的独立小夹具，未声称运行了项目生产数据库。

同时重新核对修改字段的双语结构及微练习正确答案引用。未在本审阅中运行浏览器、训练模型、调用云服务、发布资源或改变实际检验成绩。

