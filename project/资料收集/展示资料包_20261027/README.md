# 四套课程展示资料包

这是按网站收集指南完成的第一版资料：4份课程介绍、16章中文正文、4组离线实践、参考成果与自查、13条来源登记，以及4条外部视频参考。

## 从这里开始

1. 每门课先读course.md，再依次读chapters/01.md到04.md。
2. 在practice/按task.md使用输入；独立完成后再看reference/。
3. 视频信息和中文观看提示在video/video.md；四条均为外链，未附MP4、未验证完整播放。
4. sources.csv记录来源，source-receipts.json记录实际获取状态与指纹。
5. catalog-ready.json用于后续导入；本包整理完成不等于已经替换线上课程占位。

## 资料性质

- 公开下载：Palmer Penguins CSV，原始344行8列，数据按原项目CC0说明使用，原文件字节未改。
- 教学派生：企鹅练习346行，明确记录注入的问题；不冒充真实生态观测。
- 项目合成：12条AI候选回答、120条日志、12个监控窗口及12个事故事件。没有调用真实模型，也没有对真实服务器制造事故或执行恢复。
- 中文正文、任务、自查、参考说明为项目独立编写，不是复制外部整章教材。
- 外部参考：pandas、OpenTelemetry、Anthropic、Google SRE、Microsoft、CNCF、USENIX。保留原来源，不把公开可访问误写成视频可转载。

## 原始数据署名

数据由Kristen Gorman与Palmer Station Antarctica LTER提供；整理包为Allison Marie Horst、Alison Presmanes Hill、Kristen B Gorman的palmerpenguins项目。项目引用：Horst AM, Hill AP, Gorman KB (2020), palmerpenguins, https://allisonhorst.github.io/palmerpenguins/ ，DOI https://doi.org/10.5281/zenodo.3960218 。本包没有复制项目插图或把数据许可套用到视频。

校验状态与当前缺口见00_收集进度.md和validation-report.json。Agent训练不在本包范围内。
