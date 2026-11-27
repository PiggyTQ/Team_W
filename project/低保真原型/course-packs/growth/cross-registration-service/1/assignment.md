# 活动报名服务联合交付

以实施、后端、前端和测试角色轮换交付报名流程。消费同一版email接口契约，在实际界面与本机服务暴露旧mail字段错误，修订后共同验收。

## 材料与流程
先对照 input/dictionary.md 阅读完整输入 input/fixture.json。实现所需源码/配置，本机执行 verify.mjs，定位错误并修订，保存输出。准确命令见 RUN.md；reference 目录是公开教学参考，与脚手架分开。

## 产物契约
- result.json
- notes.md
- index.html
- handoff.json
- stage-1.json
- stage-2.json
- stage-3.json
- stage-4.json

result.json 是完整逐项结果，不是通过声明；notes.md 说明问题、判断、产物位置、局限、本人贡献与协助。先下载本地包实际运行，再上传产物。
## 检查与复核
- 界面调用对应版本接口，业务记录一致
- 缺陷意见有对应修改和复验
- 交接是否可执行，反馈/修改是否有依据
- 模拟角色如实标注，本人贡献与责任不混淆
## 范围与下一步
公开样例与参考用于有界练习；通过不等于独立掌握。可沿工作区中的后续项目和确切技能继续。

依次以接手角色使用 input/handoff-N.json。handoff.json 记录原问题、实际修改、接收检查与剩余风险。这是单人角色模拟，不能称真实团队经历。
