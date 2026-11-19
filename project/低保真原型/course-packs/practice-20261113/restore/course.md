# 故障恢复与回退项目

边缘网关的规则更新正在小流量发布。候选组出现 502 和 CPU 异常。你负责判断是否暂停、如何回退，以及什么时候可以宣告恢复。

回退决策、恢复验收记录和复盘行动

监控、版本、阈值和时间均为教学场景。所有操作是纸上演练。原始 Cloudflare 事故只用于理解故障与发布风险。

## 原始出处

- [Details of the Cloudflare outage on July 2, 2019](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) · Cloudflare

- [Canarying Releases](https://sre.google/workbook/canarying-releases/) · Google SRE

- [Incident Response](https://sre.google/workbook/incident-response/) · Google SRE

- [Postmortem Culture: Learning from Failure](https://sre.google/workbook/postmortem-culture/) · Google SRE

- [Storytelling as an Incident Management Skill](https://www.usenix.org/conference/srecon24americas/presentation/devesine) · USENIX · Laura de Vesine
