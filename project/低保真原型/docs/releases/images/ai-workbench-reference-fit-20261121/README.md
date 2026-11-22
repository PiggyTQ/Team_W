# 图片类别与本轮实际状态

- `reference/`：用户这次提供的三张参考图，保留原图，不作为网页实拍。
- `design.svg`：本轮修改前的结构说明图，不是完整高保真稿或实拍。
- `actual/01-home-zh-1616.png`：中文首屏。
- `actual/02-home-en-1366.png`：英文首屏。
- `actual/03-sql-tutor-closed-1616.png`：Tutor默认收起，正文使用全宽。
- `actual/04-sql-tutor-open-1616.png`：Tutor展开，正文重排，输入区保持在视口内。
- `actual/05-sql-tutor-open-en-1366.png`：英文展开状态。
- `actual/06-project-tutor-closed-1616.png`：项目中的顶栏入口与收起状态。
- `actual/flows/`：本轮重新运行的原三条完整业务链路，来自隔离合成账户和本地受控供应商，不是真实模型或生产账户。

`actual/failure.png`为初次Escape检查失败的调试证据，不是验收截图；随后已修复并重新跑通。通过记录以`checks/ai-workbench-reference-fit-20261121/desktop.log`和`flows.log`为准。

本轮范围、实现位置与测试结果见`docs/releases/ai-workbench-reference-fit-20261121.md`。
