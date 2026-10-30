# 首页功能图标来源

检索与下载日期：2026-10-24。图标来自 [Phosphor Icons 官方网站](https://phosphoricons.com/) 与 [官方 SVG 仓库](https://github.com/phosphor-icons/core)。使用同一套 duotone 权重，保持首页功能区语义和造型一致；所有 SVG 为官方原始文件，未重新绘制。

官方仓库将原始 SVG 按权重保存在 assets 目录，见 [官方使用说明](https://github.com/phosphor-icons/core/blob/main/README.md#assets)。只随项目携带以下八个图标，不安装整包，不在浏览器运行时访问第三方。

| 组件 name | 首页语义 | Phosphor 图标 / 官方来源 |
| --- | --- | --- |
| `explore` | 职业探索与方向比较 | [compass-duotone.svg](https://github.com/phosphor-icons/core/blob/main/assets/duotone/compass-duotone.svg) |
| `preparation` | 准备评估、经历与材料核对 | [clipboard-text-duotone.svg](https://github.com/phosphor-icons/core/blob/main/assets/duotone/clipboard-text-duotone.svg) |
| `learning` | 学习与实践 | [graduation-cap-duotone.svg](https://github.com/phosphor-icons/core/blob/main/assets/duotone/graduation-cap-duotone.svg) |
| `plan` | 目标与行动计划 | [target-duotone.svg](https://github.com/phosphor-icons/core/blob/main/assets/duotone/target-duotone.svg) |
| `reports` | 职业报告、简历及成果记录 | [files-duotone.svg](https://github.com/phosphor-icons/core/blob/main/assets/duotone/files-duotone.svg) |
| `opportunities` | 岗位研究与求职机会 | [briefcase-duotone.svg](https://github.com/phosphor-icons/core/blob/main/assets/duotone/briefcase-duotone.svg) |
| `assistant` | AI 讨论、咨询与方案 | [chats-circle-duotone.svg](https://github.com/phosphor-icons/core/blob/main/assets/duotone/chats-circle-duotone.svg) |
| `map` | 职业关系与技能依赖地图 | [graph-duotone.svg](https://github.com/phosphor-icons/core/blob/main/assets/duotone/graph-duotone.svg) |

原始下载 URL 规则：`https://raw.githubusercontent.com/phosphor-icons/core/main/assets/duotone/{图标名}-duotone.svg`。

## 接入

`HomeCapabilityIcon` 使用 Vite 的静态 `?raw` 导入，将受版本控制的 SVG 原始路径嵌入内联 SVG，继承 `currentColor`。组件不接收外部 SVG 或用户提供的 HTML。默认 `size={36}`、`decorative={true}`、`aria-hidden="true"`；有邻接文字时保留默认。独立表达含义时传 `decorative={false}` 和 `label`。

```jsx
import HomeCapabilityIcon from './HomeCapabilityIcon';

<HomeCapabilityIcon name="explore" size={40}/>
<HomeCapabilityIcon name="learning" decorative={false} label="学习与实践"/>
```

## 许可

Copyright (c) 2023 Phosphor Icons。使用 MIT License；官方许可来源为 [core/LICENSE](https://github.com/phosphor-icons/core/blob/main/LICENSE)，完整许可证随资产保留在本目录 [LICENSE](./LICENSE)。
