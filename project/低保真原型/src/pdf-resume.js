import {validateResumeFile,MAX_RESUME_TEXT} from './resume-import-model.js';

// Self-hosted PDF.js, including worker, CMaps and fonts. No CDN or external model.
export async function extractResumePdf(file,signal,onProgress=()=>{}){
 validateResumeFile(file);
 const base=import.meta.env.BASE_URL+'vendor/pdfjs/';
 const pdfjs=await import('./vendor/pdfjs/pdf.mjs');
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL(base+'pdf.worker.mjs',location.href).href;
 const bytes=new Uint8Array(await file.arrayBuffer());
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const task=pdfjs.getDocument({data:bytes,cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',isEvalSupported:false,enableXfa:false});
 const abort=()=>{void task.destroy();};signal.addEventListener('abort',abort,{once:true});
 try{
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  const pdf=await task.promise;
  if(pdf.numPages>50)throw Error('文件超过 50 页，请选择简历部分后重试。');
  const pages=[];let length=0;
  for(let n=1;n<=pdf.numPages;n++){
   if(signal.aborted)throw new DOMException('Cancelled','AbortError');
   onProgress(`正在提取第 ${n} / ${pdf.numPages} 页…`);
   const page=await pdf.getPage(n),content=await page.getTextContent();let line='',lastY=null;const lines=[];
   for(const item of content.items){
    if(!('str' in item))continue;
    const y=item.transform[5];
    if(lastY!==null&&Math.abs(lastY-y)>3&&line){lines.push(line);line='';}
    line+=(line&&!/\s$/.test(line)?' ':'')+item.str;lastY=y;
    if(item.hasEOL){lines.push(line);line='';lastY=null;}
   }
   if(line)lines.push(line);
   const text=lines.join('\n');pages.push(text);length+=text.length;page.cleanup();
   if(length>MAX_RESUME_TEXT)throw Error('文件文字过多，请只保留简历页后重试。');
  }
  const text=pages.join('\n\n').trim();
  if(!text)throw Error('没有提取到可复制文字。这可能是扫描件，请先转为文字，或在这里粘贴原文。');
  return {text,fingerprint,pageCount:pdf.numPages,fileName:file.name,title:file.name.replace(/\.pdf$/i,'')};
 }catch(e){
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  if(e.name==='PasswordException')throw Error('PDF 已加密，请移除密码后重试，或粘贴文字。');
  if(['InvalidPDFException','FormatError','UnknownErrorException'].includes(e.name))throw Error('PDF 无法读取，可能已损坏。请重新导出，或粘贴文字。');
  throw e;
 }finally{signal.removeEventListener('abort',abort);await task.destroy();}
}
