# 实践内容维护与独立版本

本轮新32项已冻结为本地试用；不代表通过真人审稿或正式发布。`course-packs/growth-maintenance.json`保存状态、来源、技术复现、冻结摘要、待审队列与审计链。业务库导入采用事务及版本冲突检查。

## 修改一个现有项目

在工程目录使用Node 24。先创建独立新版本，不直接改冻结目录。以下命令是维护操作说明，本轮没有为真实旧任务升级版本。

```powershell
# revision.json 内容：{"nextVersion":2,"reason":"具体修订原因"}
node scripts/practice-content.mjs revision multi-source-analysis 1 revision.json
```

新目录仅是候选。逐项修订新版本的project、输入、字段、任务书、参考、反例、必需产物、双语与变式；其他项目及旧版本不动。现有authoring脚本使用`--project ID`限制范围，检测到冻结版本会停止。不要重新执行初次批量生成器覆盖已经冻结的32项，也不要把原规划包当成完成材料。

完成该版本的内容及运行入口后使用项目范围打包（打包会实际执行参考、错误实现、反例、缺项与修正检查）：

```powershell
node scripts/package-practice-growth.mjs --project multi-source-analysis
node scripts/practice-content.mjs candidate multi-source-analysis 2
node scripts/practice-content.mjs source-review multi-source-analysis 2
node scripts/practice-content.mjs technical multi-source-analysis 2
node scripts/practice-content.mjs freeze multi-source-analysis 2
python scripts/build-practice-deliveries.py
```

源/引用变化先记录`source-change`或执行`source-probe`进入待审队列，不静默改写冻结输入。探测仅比较可访问性与摘要，不自动授予许可。新增项目须注册独立ID、输入、输出、检查及准确技能身份，再经过同样审核；未知关联保持未知。`propose`只留下待审建议，不自动上架。

旧四项若要建立独立版本，使用`node scripts/branch-legacy-practice.mjs quality 3`。工具保留v1/v2原字节、来源与阅读章节，并创建新候选；不会使其他职业或历史任务跟随升级。此桥接能力已在临时目录和数据库验证，正式旧四项仍保持v2。

## 人审、试学与发布

`review`和`pilot`必须提供真实执行的reviewer、performed:true及实际evidence文件，摘要绑定同一个材料版本。`assign`需实际负责人。`source-review`的公开再分发授权需reviewer及rightsEvidence；不能仅将布尔值改成true。

`publish`只有在同一摘要的来源许可、技术复现、真实内容审阅、真人试学、冻结和维护人齐备时才批准。当前32项缺少后四类人类决策/记录，批准命令会拒绝。`retire`需原因，可记录替代项目；历史任务仍可回看与导出，新开与继续提交受到退役限制。

批准/退役状态只由显式`apply-local`作用于`checks/`或系统临时目录里的隔离数据库，并要求`LOCAL_CONTENT_STATE_ONLY`确认与冻结摘要一致；不触碰生产数据库。正式部署与发布需要新的用户授权。

## 可运行交付包

`course-packs/growth/{id}/{version}`是冻结材料，SHA与历史任务绑定。原材料里的`project.zip`曾漏掉嵌套reference/result.json，本轮保留其归档字节，另生成完整运输封装：`public/practice-bundles/{id}/{version}/practice.zip`。页面主下载已改用这个封装，不能把旧归档作为运行入口。

`build-practice-deliveries.py`校验每个材料文件，加入manifest、实例运行器、DELIVERY.json和START-HERE.md，安全解压后从真实解压目录执行参考。封装回执记录内容摘要、工具摘要、ZIP摘要与实际执行；修复运输封装无需静默改写材料版本。更换工具或封装方式应保留交付版本身份及旧回执。

实例运行器支持数据、接口、规则三类受控输入，各两组合法变式；非法组合拒绝。任务固定实例身份与输入摘要。运行器在用户本机执行程序/SQL/回环HTTP/规则配置，业务服务器只核对文件和固定结果，不执行用户上传代码。

## 实际验证入口

- `node --test tests/practice-growth.test.mjs`：账户隔离、32项目闭环、旧4项/v1、不可变版本、回滚、变式和发布门槛。
- `python scripts/build-practice-deliveries.py`：完整交付包解压及逐文件摘要、参考执行。
- 构建后`node tests/practice-growth-browser.mjs`与`node tests/practice-growth-compat-browser.mjs`：隔离合成账户，页面实际操作和桌面截图。
- `node scripts/report-practice-growth.mjs`：核对当前材料/页面下载/解压执行摘要后生成36行矩阵。

维护不修改已有费用账本、不启用外部模型、不授予技能长叶。自动文件检查、真实本机运行、本人复核、本人确认材料与正式技能检验继续区分。
