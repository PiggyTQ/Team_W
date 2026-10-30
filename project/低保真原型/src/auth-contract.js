export const AUTH_POLICY = Object.freeze({minPassword:8,minPasswordTypes:2,maxPassword:128,maxEmail:254,termsVersion:'2026-10-27'});
export function passwordCharacterTypes(value){
  if(typeof value!=='string')return 0;
  // Whitespace and control characters do not qualify as symbols.
  return [/\p{Lu}/u,/\p{Ll}/u,/\p{N}/u,/[\p{P}\p{S}]/u].filter(pattern=>pattern.test(value)).length;
}
export function normalizeEmail(value) { return typeof value==='string'?value.trim().toLowerCase():''; }
export function validEmail(value) {
  const email=normalizeEmail(value),parts=email.split('@');
  if(email.length>254||parts.length!==2||!parts[0]||parts[0].length>64)return false;
  if(!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(parts[0])||parts[0].startsWith('.')||parts[0].endsWith('.')||parts[0].includes('..'))return false;
  const labels=parts[1].split('.');
  return labels.length>=2&&labels.every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))&&/^[a-z]{2,63}$/.test(labels.at(-1));
}
const commonPasswords=new Set(['passwordpassword','123456789012345','1234567890123456','qwertyuiopasdfgh','aaaaaaaaaaaaaaa','111111111111111','password123456789']);
export function validateCredentials(mode,data) {
  const fields={};
  if(!validEmail(data.email))fields.email='INVALID_EMAIL';
  if(mode!=='recover') {
    const length=typeof data.password==='string'?[...data.password].length:0;
    if(length<(mode==='register'?AUTH_POLICY.minPassword:1)||length>AUTH_POLICY.maxPassword)fields.password='INVALID_PASSWORD_FORMAT';
    else if(mode==='register'&&passwordCharacterTypes(data.password)<AUTH_POLICY.minPasswordTypes)fields.password='INVALID_PASSWORD_FORMAT';
    else if(mode==='register'&&commonPasswords.has(data.password.toLowerCase()))fields.password='COMMON_PASSWORD';
  }
  if(mode==='register'&&(data.agree!==true||data.termsVersion!==AUTH_POLICY.termsVersion))fields.agree='CONSENT_REQUIRED';
  return fields;
}
const messages={
  AI_CONSENT_REQUIRED:['请先选择资料范围并明确同意发送至 DeepSeek；旧模拟授权不能用于外发。','Select the scope and explicitly agree to send it to DeepSeek. Previous demo consent does not allow external processing.'],
  AI_MODE_UNAVAILABLE:['此模式尚未开放真实 AI，请选择职业咨询、评估解释或计划推演。','This mode is not available with the live AI service. Choose career consultation, evidence explanation or plan discussion.'],
  AI_UNSUPPORTED_FACT:['模型事实未逐字对应本次原文，本次结果不可用，请调整问题后重试。','A model fact does not quote the supplied source. This response is unavailable. Adjust the question before retrying.'],
  AI_BUDGET_EXCEEDED:['本轮 AI 测试的累计预算额度不足，已停止新调用。','The remaining trial budget is insufficient. New AI calls are stopped.'],
  AI_BUDGET_CONFIG_INVALID:['AI 测试预算配置无效，调用已停止。','The AI trial budget configuration is invalid. Calls are stopped.'],
  AI_BUDGET_UNAVAILABLE:['AI 预算账本暂不可用，调用已停止。','The AI budget ledger is unavailable. Calls are stopped.'],
  AI_BUDGET_USAGE_CONFLICT:['AI 用量记录冲突，已保留费用预留并停止本次请求。','AI usage records conflict. The cost reservation is retained and this request is stopped.'],
  AI_BUDGET_PRICE_EXPIRED:['AI 价格校验已过期，请重新核对费率后再调用。','The AI price review expired. Verify rates before making further calls.'],
  AI_NOT_CONFIGURED:['AI 服务尚未启用或配置完成，现有手动流程可继续使用。','AI is not enabled or configured. You can continue manually.'],
  AI_INVALID_REQUEST:['AI 请求格式有误，请核对当前页面与资料范围。','Invalid AI request. Check the context and selected scope.'],
  AI_SCOPE_REJECTED:['本次资料范围不允许这项读取，请重新选择。','The selected scope does not allow this access.'],
  AI_CONTEXT_CHANGED:['资料或知识版本已变化，本次结果未返回，请重新读取后再试。','The context or knowledge changed. Reload before retrying.'],
  AI_BUSY:['AI 请求正在处理中，请稍后再试。','AI requests are busy. Please try again later.'],
  AI_ACCESS_DENIED:['当前账户尚未开放 AI 试用，站内核对与手动业务仍可使用。','AI trial access is not enabled for this account. On-site review and manual tools remain available.'],
  KNOWLEDGE_UNAVAILABLE:['当前知识版本不可用，请等待资料核对后重试。','The current knowledge version is unavailable. Retry after review.'],
  INVALID_CAREER:['请选择现有职业方向。','Choose an available career.'],
  PROPOSAL_EXPIRED:['预览已过期，请重新检查预算并生成预览。','The preview expired. Check the budget and preview again.'],
  AI_TIMEOUT:['AI 响应超时，请保留问题后重试或手动继续。','AI timed out. Keep your question and retry or continue manually.'],
  AI_CANCELLED:['本次 AI 请求已取消。','This AI request was cancelled.'],
  AI_PROVIDER_UNAVAILABLE:['模型服务暂时不可用，请稍后再试。','The model service is temporarily unavailable.'],
  AI_INVALID_RESPONSE:['模型返回未通过结构或引用校验，本次结果不可用。','The response failed structure or citation validation.'],
  AI_CONFIG_INVALID:['AI 服务配置需要检查，现有手动流程可继续使用。','AI configuration needs checking. You can continue manually.'],
  ACCOUNT_CHANGED:['当前浏览器已切换账户，请重新验证会话。旧账户改动没有写入新账户。','This browser switched accounts. Recheck the session. Old-account changes were not saved to the new account.'],
  INVALID_WORKSPACE:['记录格式有误，尚未保存。可下载本次记录并重试。','The record format is invalid. Download a copy and try again.'],
  WORKSPACE_TOO_LARGE:['本次记录超过保存大小限制，尚未保存。请先下载保留。','These records exceed the size limit. Download a copy first.'],
  VERSION_CONFLICT:['另一页面或设备已更新记录。请先下载本页改动，再选择重新载入。','Another page or device updated these records. Download your changes before reloading.'],
  IDEMPOTENCY_MISMATCH:['保存请求已变化，请重新载入后重试。','This save request changed. Reload and try again.'],
  SERVER_RECORD_PROTECTED:['服务器生成的记录不能由草稿覆盖，请另存修订版本。','Server-issued records cannot be overwritten by a draft. Save a new revision.'],
  COMMAND_REQUIRED:['请通过对应的确认操作提交此项变更。','Use the corresponding confirmation action for this change.'],
  TASK_PRECHECK_FAILED:['任务预检未通过，请重新核对预算、依赖、状态与必填信息。','The task precheck failed. Review the budget, dependencies, status and required fields.'],
  TASK_PAUSED:['任务已暂停，请预览并确认恢复安排。','This task is paused. Preview and confirm its schedule before resuming.'],
  DUPLICATE_TASK:['已有相同目的的任务，请续用，或明确另开任务。','A task with this purpose already exists. Continue it or explicitly create another.'],
  ATTEMPT_SAVED:['成果版本与提交回执已保存；尚未检查，不代表完成。','The artifact version and submission receipt are saved. It is unchecked and does not count as completion.'],
  LIMITED_COMPLETION_SAVED:['有限范围完成与回执已保存，未独立核验能力。','Limited-scope completion and its receipt are saved. Ability has not been independently verified.'],
  TASK_CREATED:['预算预检通过，任务与创建回执已保存。','The budget precheck passed. The task and creation receipt are saved.'],
  CLAIM_CONFIRMED:['本人确认与处理回执已保存，未独立核验能力。','Your confirmation and its receipt are saved. Ability has not been independently verified.'],
  CLAIM_WITHDRAWN:['声明已撤回，旧引用不会因重新确认而自动恢复。','The statement is withdrawn. Confirming it again will not automatically restore old references.'],
  EXPERIENCE_RECORDED:['行动补录与材料候选已保存，待本人逐项确认。','The action record and candidate material are saved, awaiting your item-by-item confirmation.'],
  BUDGET_EXCEEDED:['任务总投入超过本周预算，请调整后保存。','Tasks exceed the weekly budget. Adjust them before saving.'],
  INVALID_BUDGET:['每周预算须为 0–168 小时。','The weekly budget must be between 0 and 168 hours.'],
  INVALID_TASK_HOURS:['任务预计投入须大于 0 且不超过 168 小时。','A task estimate must be more than 0 and at most 168 hours.'],
  INVALID_DEPENDENCY:['依赖任务不存在，请核对任务安排。','A dependency is missing. Check the plan.'],
  DEPENDENCY_CYCLE:['任务依赖形成循环，请调整后保存。','Task dependencies contain a cycle. Adjust them before saving.'],
  INVALID_TASK_STATE:['任务完成状态不一致，请重新核对。','The task completion state is inconsistent. Check it again.'],
  COURSE_NOT_READY:['课程内容正在收集中，目前仅保留占位。','Course content is being collected. This is a placeholder.'],
  COURSE_VERSION_UNAVAILABLE:['对应课程版本暂不可用，已有记录保留，请重试或查看当前课程。','This course version is unavailable. Existing records are preserved.'],
  INVALID_COURSE_VERSION:['课程版本无效，请从课程目录重新打开。','Invalid course version. Reopen the course from the library.'],
  INVALID_READING_POSITION:['阅读位置无效，未覆盖原记录，请重新选择章节。','Invalid reading position. Select a chapter again.'],
  INVALID_TASK_ATTEMPT:['提交版本或课程关联无效，请核对后重试。','Invalid attempt version or course reference.'],
  COURSE_COMPLETION_INCOMPLETE:['请先提交产物、说明贡献并为最新版本记录自检，再确认完成。','Submit an artifact, describe your contribution and self-check the latest attempt before completion.'],
  OWNER_MISMATCH:['记录不属于当前账户，无法保存。','These records do not belong to this account.'],
  CONFIRMATION_REQUIRED:['请核对操作影响并填写确认信息。','Review the impact and provide the confirmation.'],
  NOT_FOUND:['记录不存在或当前账户无权访问。','This record is unavailable to this account.'],
  INVALID_EMAIL:['请输入有效邮箱，例如 you@example.com。','Enter a valid email, such as you@example.com.'],
  INVALID_PASSWORD_FORMAT:['新密码须为 8–128 个字符，并包含大写字母、小写字母、数字、符号中的至少两类；登录时须与原密码完全一致。','New passwords must contain 8–128 characters and at least two types: uppercase letters, lowercase letters, numbers or symbols. Sign-in passwords must match exactly.'],
  COMMON_PASSWORD:['这个密码过于常见，请换用更长且独特的密码或短语。','Choose a longer, unique password or passphrase.'],
  CONSENT_REQUIRED:['请阅读并主动同意账户使用与隐私说明。','Read and accept the account and privacy notes.'],
  INVALID_CREDENTIALS:['邮箱或密码不正确，请检查后重试。','The email or password is incorrect. Please try again.'],
  ACCOUNT_UNAVAILABLE:['暂时无法使用此邮箱注册，请尝试登录或使用其他邮箱。','This email cannot be registered. Try signing in or use another email.'],
  RATE_LIMITED:['尝试过于频繁，请稍后再试。','Too many attempts. Please try again later.'],
  RECOVERY_UNAVAILABLE:['找回密码邮件服务尚未配置，目前无法发送重置邮件。','Password recovery email is not configured yet. No reset email was sent.'],
  INSECURE_TRANSPORT:['请通过 HTTPS 安全连接登录。','Use HTTPS to sign in securely.'],
  CSRF_REJECTED:['页面验证已失效，请刷新页面后重试。','Page verification expired. Refresh and try again.'],
  NETWORK_ERROR:['网络连接失败或超时，输入已保留，请重试。','The connection failed or timed out. Your input is still here.'],
  SERVICE_UNAVAILABLE:['账户服务暂时不可用，请稍后重试。','The account service is temporarily unavailable. Please try again.'],
  SESSION_EXPIRED:['登录已过期，请重新登录。','Your session expired. Please sign in again.']
};
export function authMessage(code,language='zh') {return (messages[code]||messages.SERVICE_UNAVAILABLE)[language==='en'?1:0];}
export function safeAuthTarget(value) {
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return '/app';
  try {const u=new URL(value,'https://career.invalid');return u.origin==='https://career.invalid'&&!['/auth','/'].includes(u.pathname)&&!u.pathname.startsWith('/admin')?u.pathname+u.search+u.hash:'/app';}catch{return '/app';}
}
