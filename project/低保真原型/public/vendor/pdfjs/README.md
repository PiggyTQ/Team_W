# PDF.js 5.6.205

Mozilla PDF.js 的浏览器发行文件，来自 Codex 随附依赖 pdfjs-dist 5.6.205。遵循本目录 LICENSE（Apache-2.0），字体/CMap 另见各子目录许可证。主模块位于 `src/vendor/pdfjs/pdf.mjs`，作为独立异步包构建；其余资源在此目录同源加载。

用于浏览器本机提取简历文字，按需加载；不请求 CDN、不执行 PDF 内脚本、不执行 OCR。升级时同步替换 pdf.mjs、pdf.worker.mjs、cmaps 与 standard_fonts。
