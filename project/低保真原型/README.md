# 职业探索与成长 Web

React 19 + Vite 7 前端，Node.js 24 原生 HTTP 后端，SQLite 数据持久化。目录名称沿用早期工程名称；最新业务与实现状态以 `PRODUCT.md` 及近期验收文档为准，`README_使用说明.md` 保留早期原型操作记录。

## 新电脑准备

安装 Node.js 24（支持 `node:sqlite`）、npm 和 Python 3。以下命令均在本目录运行。Windows 终端可用 PowerShell；不需要服务器密钥。

```powershell
npm ci
node scripts/setup-local.mjs
Copy-Item .env.server.example .env.server
npm test
npm run build:server
```

若 Python 命令不是 `python`，可指定可执行文件：`node scripts/setup-local.mjs "C:/完整路径/python.exe"`。初始化会创建本机全新账户库和可重建的职业目录，导入四套课程，不创建真实用户，不调用外部服务。发现已有账户库会停止，以免覆盖本机记录。生成文件都在忽略目录中。

## 启动完整本地网站

第一个终端启动后端，保留终端运行：

```powershell
$env:PUBLIC_ORIGIN='http://127.0.0.1:5184'
$env:AI_ENABLED='0'
$env:MAIL_ENABLED='0'
$env:BACKUP_REMOTE_ENABLED='0'
npm run start:auth
```

第二个终端启动前端：

```powershell
$env:CAREER_API_PROXY='http://127.0.0.1:3001'
npm run dev -- --mode server
```

打开 <http://127.0.0.1:5184>，注册本机测试账户，即可使用真实本地账户保存、材料确认、计划任务、报告和规则建议。前后端通过本地代理保持同源。要单独查看演示模式，可在未加载 `server` 模式时运行 `npm run dev`。

## 测试与构建

`npm test` 运行自动化单元及本地接口测试；使用合成账户和临时数据库，不需要 DeepSeek 密钥。首次测试前须完成上述初始化。`npm run build` 构建演示前端；配置好 `.env.server` 后的 `npm run build:server` 构建账户服务模式前端。`dist/` 不提交。

历史浏览器检查脚本包含开发机路径、浏览器安装路径和历史截图依赖，不属于可移植的 `npm test` 默认测试集；换电脑时需按脚本要求调整。脚本和历史验收记录不代表在新机器上已执行。

## 数据与能力边界

- `src/`、`public/`：页面、状态、样式、翻译和实际使用的资源。
- `server/`：鉴权、业务命令、版本与回执、课程、报告、管理权限、邮件和运行监测。
- `knowledge/`：带来源与范围的原创知识内容；不等同于独立职业专家背书。
- `../职业画像最终版_V3/`、`../数据集/`：目录重建输入，保留历史岗位和审核限制。
- `../资料收集/展示资料包_20261027/`：四套课程及原始校验清单。
- `tests/fixtures/`：必要的合成回归样本，已移除完整请求日志和运行元数据。
- `deploy/`：现有环境的部署参考，包含服务器路径及配置约定。先阅读并适配，不能把历史发布脚本当作通用安装器直接执行。

AI 默认关闭，个性化规则建议仍可工作。启用模型需要服务端配置、有效费用策略和用户授权；禁止在 `VITE_*` 或前端代码中放密钥。既有生产累计 8 元预算账本未包含在仓库中，也不得因克隆或重新初始化而重置。

正式对外运营仍有外部邮件/备份服务配置、实际管理角色安排和真实学生任务验证等条件；GitHub 上传不代表这些服务已开通。
