# 本轮真实网页截图（2026-11-22）

本目录为本轮构建在临时账户、临时SQLite上的真实Edge网页截图，不是概念图或真实用户记录。模型与邮件关闭，临时账户由验证脚本清除。主脚本62张，加边界状态3张，共65张；文件摘要见manifest.json。截图展示对应滚动位置，非全页被压缩到一屏。

- `data-{zh|en}-{1366|1616}x{900|960|1100}.png`：12组首屏。
- `outputs-…`：对应12组数据产物；17px正文，短口径表与验收区按容器并排，长图表保留空间。
- `compare-…`：12组比较；900/960高为2职业，1100高为3职业。代表任务常显，完整范围按需查看。
- `case-{职业ID}-zh-1616.png`：10方向各自的短分岔及体验位置；与原案例相连。
- `ai-long-draft-{zh|en}-1366.png`、`security-long-draft-…`：原文与编号定位、长稿、尝试后教学对照；中文本人原文在英文界面保留。
- `01-material-load-failure.png`、`02-material-three-unsaved.png`、`03-material-three-saved.png`：三职业关联、加载失败及未保存/已保存。
- `04-selected-material-ai-review.png`、`05-ai-after-unlink.png`：站内选中材料核对及解除后的上下文状态；无真实模型调用。
- `06-target-current-set-reason.png`、`07-trial-save-failure.png`、`08-frontend-local-failure.png`：本组目标理由、保存失败、前端本机模拟失败。
- `edge-material-save-failure.png`、`edge-material-version-conflict.png`、`edge-trial-save-queue.png`：命令失败、版本冲突、持久化尚未确认。
- `sources-expanded-en-1366.png`、`material-editor-en-1366.png`：来源许可与宽编辑层。
- `report-existing-tabs-en.png`、`ai-public-comparison-en.png`：原报告与AI公开资料的存在性回归截图；四页签点击及键盘验收另见edge-results.json，不能仅凭一张图证明。

视觉查看采用一批检查及一次确认；必要修正为实际字号、材料编辑边框和安全对照。功能脚本中的失败截图在checks目录，仅作调试，不列为成功实拍。未检查移动端、真人学习效果、真实模型质量或生产页面。
