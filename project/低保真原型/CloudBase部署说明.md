# 腾讯云 CloudBase 审查预览部署

当前状态：2026-10-17 已部署成功并完成远端文件校验。环境 ID：`career-direction-d2ekb7ve0927e92`。

审查网址：https://career-direction-d2ekb7ve0927e92-1509291365.tcloudbaseapp.com/

6 个网页资源全部上传并校验通过，已有 __auth 与 cloud-admin 目录保留，没有清理云端其他文件。首页和错误页均已配置为 index.html。浏览器已验证首页、模拟登录、跳过首次设置、计划子路由直接访问及刷新。

首次打开默认测试域名可能先显示腾讯云提示页，点击“确定访问”后进入。这是 CloudBase 测试域名的访问提示；本轮没有配置自定义域名，也没有移除平台提示。

下面保留新环境部署流程，供后续复用。当前环境不需要再创建。

## 用户需先完成

1. 打开 https://tcb.cloud.tencent.com/dev ，使用本人腾讯云账号登录；如平台要求实名认证，请本人完成。
2. 创建专用于本原型审查的环境。若显示套餐购买、按量计费、服务协议等，请本人检查并确认，不由助手代购或代签。
3. 开通环境的“静态网站托管”。本次只托管前端，不需要创建数据库、云函数或 AI 服务。
4. 将环境 ID（envId）发给助手。不要发送密码、SecretId 或 SecretKey。

## 已准备的上传包

`发布包/cloudbase-preview.zip`，约 350 KB。解压后应直接看到 `index.html`、`assets/`、`black.svg`。只含构建网页资源，不包含 PRD、文档、检查截图或浏览器私有资料。

如果自行上传，选择静态网站托管的“文件管理”，上传解压后的整个内容，保持 assets 目录，不要将 zip 当网页文件直接上传，也不要多套一层 dist 文件夹。根目录入口为 index.html。

## 必须配置 SPA 回退

静态托管的基础/网站配置中：默认首页设为 `index.html`，错误页面也设为 `index.html`。否则从首页进入页面可用，但直接访问或刷新 `/plan`、`/assessment`、`/reports` 等子路由可能失败。Vercel 的 vercel.json 不用于 CloudBase。

## CLI 部署方式

官方工具包：`@cloudbase/cli`，可执行命令 `tcb` 或 `cloudbase`。本项目已经使用 Vite 构建到 dist。

```powershell
npm run build
npx --yes --package @cloudbase/cli tcb login
npx --yes --package @cloudbase/cli tcb hosting deploy dist -e 你的环境ID
```

在发出实际部署命令前核对环境和根目录是否为本审查网站专用，上传会覆盖同名文件。本轮没有删除已有云端内容。

部署后从控制台复制真实的默认访问域名，不根据 envId 猜测域名。检查首页、计划、简历、AI 工作台及子路由刷新；只有这些通过后再向队友提供最终审查链接。

## 当前功能边界

部署只改变访问方式，不接入真实登录、AI、解析、岗位或课程后台。用户资料保存在各自浏览器中，不跨队友同步，也不会自动带上本机原有资料。

## 官方依据

- https://docs.cloudbase.net/hosting/quick-start
- https://docs.cloudbase.net/hosting/web-hosting-static
- https://docs.cloudbase.net/quick-start/migration/vercel


## 后续发布到当前环境

```powershell
npm run build
npx --yes --package @cloudbase/cli tcb hosting deploy dist -e career-direction-d2ekb7ve0927e92 --safe --verify
```

保持现有站点 index.html 回退配置，不使用 --prune，避免误删平台认证和管理目录。登录过期时再通过 tcb login 进行本人授权。私密授权信息由官方工具保存，不写入网页资源。

实际截图：检查记录/CloudBase部署/线上首页.png。部署校验记录：检查记录/CloudBase部署/部署记录.json。


## 本地版本提醒

v19 首页弹性停靠按用户要求只改本地代码，没有重新上传。线上仍为本记录中的v18部署。本地dist已经重新构建；只有后续明确要求发布时再上传。
