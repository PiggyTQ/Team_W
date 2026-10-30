import fs from 'node:fs';
const prefix='# 事件驱动个人上下文与规则建议后端已部署（2026-10-29）\n\n用户授权部署并保持 AI 关闭。新增三张个人上下文/事件/建议反馈表，关键业务保存同事务刷新上下文；草稿和浏览不触发模型。规则建议含依据和页面入口，旧基线反馈拒绝，事件及反馈支持导出和清理。模型仅使用本次授权范围摘要，未开放完整履历或历史对话记忆。前端建议卡尚未接入，原静态版本保持不变。\n\n本轮 415 项自动测试通过、1 项旧测试跳过、0 失败；独立环境及生产 API 各 17 组、生产浏览器 10 组通过，合成账户均已注销。截图首次等待字体超时后重跑，记录已保留。费用账本不变、无新增模型调用，备份服务执行成功。[接口及验收说明](个人上下文与事件建议_20261029.md)。以下保留原实施历史。\n';
const file='PRODUCT.md',current=fs.readFileSync(file,'utf8');if(!current.startsWith(prefix.split('\n')[0]))fs.writeFileSync(file,prefix+'\n'+current);
fs.writeFileSync('checks/personal-context-20261029/PRODUCT-prefix.md',prefix);
