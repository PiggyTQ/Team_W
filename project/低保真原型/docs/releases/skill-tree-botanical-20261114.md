# 职业成长树 · 植物手绘版

## 设计比较

先生成两组枯树和茂树的对照图。植物手绘方案的灰褐木纹、枝干衔接和根部木节清楚，也贴近工作区的暖色表面。水墨方案的青灰层次更强，采用了其中由芽萼托住的圆润水灵珠。另做一张工作区效果图，检查枝名沿木纹排列后的可读性，以及树、分支路线和学习区的关系。[植物手绘](images/skill-tree-botanical-20261114/concepts/botanical-study.webp) · [水墨方案](images/skill-tree-botanical-20261114/concepts/ink-study.webp) · [整页效果图](images/skill-tree-botanical-20261114/concepts/integrated-layout.webp)

## 实现

桌面分支名沿四条木纹排布，点击文字切换路线。职业名放在树干正面，累计通过数放在根下。根部年轮沿插画中原有木节的位置和轮廓绘制，通过一项着色一圈。十个职业共用一棵插画骨架，各自的名称、技能与进度由账户数据填入。

用同一张枯木图承接所有进度。完成技能的枝条在原木纹上轻微回暖，叶色集中在已通过的枝梢，整条分支通过才加上外围叶冠，主干和枝名之间留出空隙。点击检验结果里的「回到树上」时，新通过节点会短暂播放水灵珠沁入、嫩芽展开、叶簇长成的过程。启用减少动态效果时直接呈现结果。

地图使用与学习与实践中心相近的暖白表面、细边线、深蓝标题和浅蓝资料区。分支信息、学习顺序、练习和检验串在同一块内容区里。窄屏用树下的分支名称和进度切换，树上显示当前分支的水灵珠，保留已长成的叶片。

## 页面实拍

- [枯树](images/skill-tree-botanical-20261114/actual/01-empty-tree.png) · [首次长叶](images/skill-tree-botanical-20261114/actual/02-progress.png) · [完成一条分支](images/skill-tree-botanical-20261114/actual/05-mature-branch.png) · [全树点亮](images/skill-tree-botanical-20261114/actual/06-full-canopy.png)
- [手机尺寸](images/skill-tree-botanical-20261114/actual/04-mobile.png) · [学习与检验区](images/skill-tree-botanical-20261114/actual/03-check.png)

## 核查

本地覆盖十个方向，核对 1024px 和 1440px 的 40 个枝名与 123 个技能入口，另核对 320px 和 390px 分支切换、键盘操作、逐阶段动效及减少动态效果、进度刷新恢复和全树叶冠边缘。服务器模式及演示模式构建通过。生成素材的完整提示词随 `src/assets/skill-tree/` 下对应 WebP 的 JSON 存档。

已发布至阿里云 `skill-tree-botanical-20261114-01`。服务器相关回归 106 项通过，HTTPS 核对 16 项网页文件以及地图、登录入口和 API 健康状态。临时账户完成错题后通过、枝条进度从 0% 到 33%、水灵珠变叶、年轮着色、练习记录刷新恢复和窄屏切换，随后清理该账户。复测使用线上 HTTPS 页面与接口，大文件逐项核对后使用本机缓存。前一静态版本及本轮源文件快照保留在服务器。
