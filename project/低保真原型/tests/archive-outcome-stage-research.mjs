// Documentation-only: source provenance and schematic storyboard, no browser execution.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const app=process.cwd(),project=path.dirname(app),dir=path.join(project,'参考调研_20261017/PierGorelli_02');
const frames=[
 ['0.00','轮廓起笔','Plot',.12,0],['0.40','轮廓与标记建立','Plot',.55,0],['0.95','旧线框变淡，细节加入','Plot → Build',1,.05],
 ['1.50','结构归位与填充','Build',1,.4],['2.00','成品开始擦入','Build → Live',1,.02],['2.45','成品与结构并存','Live',1,.5],
 ['2.90','成品完整，可交互','Live',1,1],['3.20','说明和画面开始退出','项目过渡',1,1],['3.70','新项目错开进入','下一项目',.2,0],
];
const panels=frames.map(([t,title,phase,line,live],i)=>{
 const x=40+(i%3)*520,y=160+Math.floor(i/3)*280;
 const opacity=i===7?.35:1;
 return `<g transform="translate(${x} ${y})"><rect width="495" height="250" rx="5" fill="#fff" stroke="#bbb"/><text x="18" y="28" font-size="14">t=${t} · ${title}</text><text x="18" y="51" font-size="11" fill="#666">${phase}</text><g opacity="${opacity}"><rect x="18" y="69" width="134" height="151" fill="#f2f2f2"/><text x="29" y="101" font-size="26">${i===8?'02':'01'}</text><path d="M29 126h100M29 141h82M29 156h90" stroke="#aaa"/><rect x="170" y="69" width="306" height="151" fill="#f8f8f8" stroke="#aaa" stroke-dasharray="${i<3?'5 4':'none'}"/><path d="M188 202V89H455V202Z" fill="none" stroke="#666" stroke-width="2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1-line}"/><path d="M189 118h265M270 119v82M189 154h265" stroke="#bbb" opacity="${i>1?1:.15}"/>${live?`<rect x="185" y="84" width="${277*live}" height="123" fill="#d8d8d8"/><path d="M199 107h${Math.min(200,240*live)}M199 123h${Math.min(150,240*live)}M199 167h${Math.min(210,240*live)}M199 183h${Math.min(180,240*live)}" stroke="#888" stroke-width="5"/>`:''}</g><text x="18" y="238" font-size="10" fill="#777">源码时序示意；不等于实拍截图或固定等待秒数</text></g>`;
}).join('');
fs.writeFileSync(path.join(dir,'02区关键帧_源码还原示意.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1050" viewBox="0 0 1600 1050"><rect width="1600" height="1050" fill="#f2f2f2"/><g font-family="Microsoft YaHei,Arial,sans-serif" font-weight="400" fill="#292929"><text x="40" y="50" font-size="27">[02] Selected work · 关键帧还原示意</text><text x="40" y="83" font-size="15">参考：piergorelli.com · 2026-10-17 · 单一舞台 / 左说明 / 右过程与成品</text><text x="40" y="112" font-size="14" fill="#666">依据公开源码与离散浏览器取样绘制，非原站截图；t为时间线位置，滚动scrub下不等于实际观看秒数。</text>${panels}<text x="40" y="1030" font-size="13">本项目采用空间与内容连续性；当前低保真通过按钮展示三态，尚未实现滚动固定和连续形变。</text></g></svg>`,'utf8');
const files=fs.readdirSync(dir).filter(n=>/\.(js|css|html)$/.test(n)).map(name=>({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex')}));
fs.writeFileSync(path.join(dir,'来源与核对记录.json'),JSON.stringify({date:'2026-10-17',page:'https://piergorelli.com/#work',target:'[02] Selected work',method:'浏览器关键画面取样 + 公开源码时序还原；非逐刷新帧完整录屏',files,sourceUrls:['https://piergorelli.com/_astro/work-stage.DzNATKeh.js','https://piergorelli.com/_astro/index.CG0hduNO.css','https://piergorelli.com/_astro/motion.DTpMruWt.js'],desktop:{minWidth:1024,minHeight:600,scrollViewportFactorPerProject:1.6,projects:3,masterDuration:11.6,projectOffset:4},captures:['实际观察_02区_入口.png','实际观察_02区_推进01.png','实际观察_02区_推进02.png'],excludedCapture:'实际观察_首屏_非02.png',unverified:'未完整录制所有刷新帧；各项目任意位置与所有硬件表现未全面验收'},null,2),'utf8');
const record=path.join(app,'检查记录/成果舞台_v2/CUA检查.json');
const checks=JSON.parse(fs.readFileSync(record,'utf8'));
if(!checks.checks.some(x=>x.includes('320×740')))checks.checks.push('320×740窄屏：15状态，无整页/画布横溢，结束恢复默认视口');
fs.writeFileSync(record,JSON.stringify(checks,null,2),'utf8');
console.log('Saved storyboard, source provenance and updated CUA evidence.');
