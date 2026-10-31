// Server-only adapter. Endpoint and request options cannot be supplied by a browser.
// Official contracts verified 2026-10-28:
// https://api-docs.deepseek.com/api/create-chat-completion/
// https://api-docs.deepseek.com/guides/json_mode/
export const DEEPSEEK_CHAT_ENDPOINT = 'https://api.deepseek.com/chat/completions';

export class DeepSeekError extends Error {
  constructor(code, status = 502) {
    super(code);
    this.name = 'DeepSeekError';
    this.code = code;
    this.status = status;
  }
}

const invalidResponse = () => new DeepSeekError('AI_INVALID_RESPONSE');
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integerIn = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const abortFailure = timedOut => new DeepSeekError(timedOut ? 'AI_TIMEOUT' : 'AI_PROVIDER_UNAVAILABLE', timedOut ? 504 : 503);

function safeUsage(value) {
  if (!isRecord(value)) return null;
  const result = {};
  for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens', 'prompt_cache_hit_tokens', 'prompt_cache_miss_tokens']) {
    if (integerIn(value[key], 0, Number.MAX_SAFE_INTEGER)) result[key] = value[key];
  }
  return Object.keys(result).length ? result : null;
}

async function readBoundedJSON(response, maxBytes, signal) {
  const rejectBody = () => {void response.body?.cancel().catch(() => {}); throw invalidResponse();};
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) rejectBody();
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBytes)) rejectBody();
  if (!response.body || typeof response.body.getReader !== 'function') throw invalidResponse();
  const reader = response.body.getReader();
  const onAbort = () => {void reader.cancel().catch(() => {});};
  signal.addEventListener('abort', onAbort, {once: true});
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const {done, value} = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw invalidResponse();
      length += value.byteLength;
      if (length > maxBytes) throw invalidResponse();
      chunks.push(value);
    }
    signal.throwIfAborted();
    let data;
    try {data = JSON.parse(Buffer.concat(chunks, length).toString('utf8'));} catch {throw invalidResponse();}
    if (!isRecord(data)) throw invalidResponse();
    return data;
  } finally {
    // Cancel also on malformed/oversized bodies; do not wait on untrusted streams.
    void reader.cancel().catch(() => {});
    signal.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
}

/**
 * Returns only parsed output, selected token counters, and model provenance.
 * This adapter does not validate career facts or citations, run tools, persist
 * conversations, log provider bodies, or perform automatic paid retries.
 */
export function createDeepSeekClient({
  apiKey,
  model,
  fetchImpl = globalThis.fetch,
  timeoutMs = 30000,
  maxResponseBytes = 262144,
  maxTokens = 2048,
  budget = null,
} = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim() || typeof model !== 'string' || !model.trim()) {
    throw new DeepSeekError('AI_NOT_CONFIGURED', 503);
  }
  if (apiKey.length > 4096 || /\s/.test(apiKey) || !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/.test(model)
      || typeof fetchImpl !== 'function' || !integerIn(timeoutMs, 1, 120000)
      || !integerIn(maxResponseBytes, 1024, 1048576) || !integerIn(maxTokens, 128, 4096)
      || (budget !== null && (typeof budget.reserve !== 'function' || typeof budget.recordUsage !== 'function' || typeof budget.summary !== 'function'))) {
    throw new DeepSeekError('AI_CONFIG_INVALID', 500);
  }

  return Object.freeze({
    configuredModel: model,
    close() {budget?.close?.();},
    async respond({messages, signal} = {}) {
      if (!Array.isArray(messages) || messages.length < 1 || messages.length > 32
          || !messages.every(message => isRecord(message) && ['system', 'user', 'assistant'].includes(message.role)
            && typeof message.content === 'string' && message.content.length <= 40000)
          || !messages.some(message => ['system', 'user'].includes(message.role) && /json/i.test(message.content))) {
        throw new DeepSeekError('AI_CONFIG_INVALID', 500);
      }
      if (signal !== undefined && !(signal instanceof AbortSignal)) throw new DeepSeekError('AI_CONFIG_INVALID', 500);
      // Copy only approved properties; no caller tool, URL, user_id, or reasoning fields.
      const request = JSON.stringify({
        model,
        messages: messages.map(({role, content}) => ({role, content})),
        stream: false,
        thinking: {type: 'disabled'},
        response_format: {type: 'json_object'},
        max_tokens: maxTokens,
      });
      if (Buffer.byteLength(request, 'utf8') > 98304) throw new DeepSeekError('AI_CONFIG_INVALID', 500);
      if (signal?.aborted) throw abortFailure(false);
      if (budget === null && fetchImpl === globalThis.fetch) throw new DeepSeekError('AI_BUDGET_CONFIG_INVALID', 500);

      const controller = new AbortController();
      let timedOut = false;
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort, {once: true});
      const deadline = Date.now() + timeoutMs;
      const timeout = setTimeout(() => {timedOut = true; controller.abort();}, timeoutMs);
      let rejectAbort;
      const aborted = new Promise((_, reject) => {rejectAbort = () => reject(abortFailure(timedOut));});
      controller.signal.addEventListener('abort', rejectAbort, {once: true});
      const work = async () => {
        if (controller.signal.aborted) throw abortFailure(timedOut);
        // Reserve atomically immediately before the paid request. Failures and
        // timeouts retain this reservation; usage is observation, never a refund.
        const reservation = budget?.reserve({model, requestBytes: Buffer.byteLength(request, 'utf8'), maxTokens});
        if (Date.now() >= deadline) {timedOut = true; controller.abort();}
        if (controller.signal.aborted) throw abortFailure(timedOut);
        const response = await fetchImpl(DEEPSEEK_CHAT_ENDPOINT, {
          method: 'POST',
          redirect: 'error',
          headers: {'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${apiKey}`},
          body: request,
          signal: controller.signal,
        });
        if (controller.signal.aborted) throw abortFailure(timedOut);
        // Native fetch rejects redirects above. Check metadata too for injected clients.
        if (response.redirected || (response.url && response.url !== DEEPSEEK_CHAT_ENDPOINT)) throw new DeepSeekError('AI_PROVIDER_UNAVAILABLE');
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          throw new DeepSeekError('AI_PROVIDER_UNAVAILABLE', 503);
        }
        const envelope = await readBoundedJSON(response, maxResponseBytes, controller.signal);
        if (reservation) budget.recordUsage(reservation.reservationId, safeUsage(envelope.usage));
        if (!Array.isArray(envelope.choices) || envelope.choices.length !== 1) throw invalidResponse();
        const choice = envelope.choices[0];
        if (!isRecord(choice) || choice.finish_reason !== 'stop' || !isRecord(choice.message)
            || choice.message.role !== 'assistant' || typeof choice.message.content !== 'string'
            || !choice.message.content.trim() || (choice.message.tool_calls?.length ?? 0) !== 0) throw invalidResponse();
        let output;
        try {output = JSON.parse(choice.message.content);} catch {throw invalidResponse();}
        if (!isRecord(output)) throw invalidResponse();
        const providerActualModel = typeof envelope.model === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/.test(envelope.model)
          ? envelope.model : null;
        return {output, usage: safeUsage(envelope.usage), configuredModel: model, providerActualModel,
          ...(reservation ? {budget: budget.summary()} : {})};
      };
      try {
        return await Promise.race([work(), aborted]);
      } catch (error) {
        if (controller.signal.aborted) throw abortFailure(timedOut);
        if (['AI_BUDGET_EXCEEDED','AI_BUDGET_CONFIG_INVALID','AI_BUDGET_UNAVAILABLE','AI_BUDGET_USAGE_CONFLICT','AI_BUDGET_PRICE_EXPIRED'].includes(error?.code)) throw error;
        if (error instanceof DeepSeekError) throw error;
        // Provider errors may contain credentials or submitted text; never retain them.
        throw new DeepSeekError('AI_PROVIDER_UNAVAILABLE');
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
        controller.signal.removeEventListener('abort', rejectAbort);
      }
    },
  });
}
