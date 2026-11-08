export const RESOURCE_PROJECT_MAX_BYTES=10*1024*1024;
export const RESOURCE_PROJECT_MAX_COUNT=100;
export const RESOURCE_PROJECT_TOTAL_BYTES=100*1024*1024;
export const RESOURCE_PROJECT_ACCEPT='.pdf,.zip,.txt,.md,.json,.csv,.docx,.png,.jpg,.jpeg';
const mimeByExtension={pdf:'application/pdf',zip:'application/zip',txt:'text/plain',md:'text/markdown',json:'application/json',csv:'text/csv',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
export const resourceProjectError=code=>Object.assign(new Error(code),{code,status:code==='RESOURCE_PROJECT_NOT_FOUND'?404:code==='RESOURCE_PROJECT_TOO_LARGE'||code==='RESOURCE_PROJECT_QUOTA'?413:400});
export function normalizeResourceProject(input,file){
 if(!input||typeof input!=='object'||input.completed!==true)throw resourceProjectError('RESOURCE_PROJECT_COMPLETION_REQUIRED');
 const text=(key,max,required=false)=>{const value=input[key]??'';if(typeof value!=='string'||value.length>max||required&&!value.trim())throw resourceProjectError('RESOURCE_PROJECT_INVALID');return value.trim();};
 const title=text('title',120,true),description=text('description',5000,true),contribution=text('contribution',2000),career=text('career',80);
 if(!file||typeof file.name!=='string'||!file.name.trim()||file.name.length>180||/[\u0000-\u001f\u007f/\\]/.test(file.name))throw resourceProjectError('RESOURCE_PROJECT_FILE_REQUIRED');
 const extension=file.name.split('.').at(-1).toLowerCase(),type=Object.hasOwn(mimeByExtension,extension)?mimeByExtension[extension]:null;
 if(!type)throw resourceProjectError('RESOURCE_PROJECT_FILE_TYPE');
 if(!Number.isSafeInteger(file.size)||file.size<=0)throw resourceProjectError('RESOURCE_PROJECT_FILE_REQUIRED');
 if(file.size>RESOURCE_PROJECT_MAX_BYTES)throw resourceProjectError('RESOURCE_PROJECT_TOO_LARGE');
 return {title,description,career,contribution,completed:true,file:{name:file.name,type,size:file.size}};
}
export function resourceProjectErrorMessage(error){
 const messages={RESOURCE_PROJECT_COMPLETION_REQUIRED:'请先确认这是已完成的项目。',RESOURCE_PROJECT_INVALID:'请填写项目名称与成果说明，并检查文字长度。',RESOURCE_PROJECT_FILE_REQUIRED:'请选择一个有效的项目成果文件。',RESOURCE_PROJECT_FILE_TYPE:'请上传 PDF、ZIP、TXT、MD、JSON、CSV、DOCX、PNG 或 JPG 文件。',RESOURCE_PROJECT_TOO_LARGE:'文件不能超过 10 MB。',RESOURCE_PROJECT_QUOTA:'资源存储空间已满，请先删除不需要的项目。',RESOURCE_PROJECT_NOT_FOUND:'项目已不存在，请刷新资源列表。',RESOURCE_PROJECT_STORAGE_UNAVAILABLE:'无法保存文件，请检查浏览器存储权限后重试。',RESOURCE_PROJECT_STORAGE_FULL:'浏览器存储空间不足，请释放空间后重试。',SESSION_EXPIRED:'登录已过期，请重新登录后重试。',ACCOUNT_CHANGED:'账户已变化，请刷新后重试。'};
 return messages[error?.code]||'资源操作失败，已有文件保留，请重试。';
}
