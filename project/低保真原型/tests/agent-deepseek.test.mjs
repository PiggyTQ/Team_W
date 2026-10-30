import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeepSeekClient, DeepSeekError, DEEPSEEK_CHAT_ENDPOINT} from '../server/agent/deepseek.mjs';

const messages = [{role: 'system', content: 'Return json, e.g. {"answer":"text"}.'}, {role: 'user', content: '解释职业。'}];
const envelope = (overrides = {}) => ({
  model: 'provider-model-snapshot',
  choices: [{finish_reason: 'stop', message: {role: 'assistant', content: '{"answer":"需要已审依据。"}', reasoning_content: 'never expose private reasoning'}}],
  usage: {prompt_tokens: 60, completion_tokens: 20, total_tokens: 80, raw_private_field: 'private'},
  ...overrides,
});
const response = (data, options = {}) => new Response(JSON.stringify(data), {headers: {'Content-Type': 'application/json'}, ...options});
const client = fetchImpl => createDeepSeekClient({apiKey: 'test-key-never-log', model: 'configured-model-alias', fetchImpl});
const fails = (code, fn) => assert.rejects(fn, error => error instanceof DeepSeekError && error.code === code && error.message === code);

test('DeepSeek requires explicit server configuration and validates bounded options', () => {
  for (const config of [{}, {apiKey: 'key'}, {model: 'model'}, {apiKey: '', model: 'model'}]) {
    assert.throws(() => createDeepSeekClient(config), {code: 'AI_NOT_CONFIGURED'});
  }
  for (const options of [{apiKey: 'key\nsecret'}, {model: 'https://evil.test?key=secret'}, {timeoutMs: 0}, {maxTokens: 999999}, {maxResponseBytes: 99999999}, {fetchImpl: 1}]) {
    assert.throws(() => createDeepSeekClient({apiKey: 'key', model: 'explicit-model', ...options}), {code: 'AI_CONFIG_INVALID'});
  }
});

test('DeepSeek uses fixed HTTPS endpoint, disables redirects/thinking and returns only validated public fields', async () => {
  let calls = 0;
  const result = await client(async (url, options) => {
    calls++;
    assert.equal(url, DEEPSEEK_CHAT_ENDPOINT);
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer test-key-never-log');
    assert.deepEqual(JSON.parse(options.body), {
      model: 'configured-model-alias', messages, stream: false, thinking: {type: 'disabled'}, response_format: {type: 'json_object'}, max_tokens: 2048,
    });
    return response(envelope());
  }).respond({messages: messages.map(message => ({...message, user_id: 'private-owner', tool_calls: ['untrusted']}))});
  assert.equal(calls, 1);
  assert.deepEqual(result, {
    output: {answer: '需要已审依据。'}, usage: {prompt_tokens: 60, completion_tokens: 20, total_tokens: 80},
    configuredModel: 'configured-model-alias', providerActualModel: 'provider-model-snapshot',
  });
  assert.equal(JSON.stringify(result).includes('reasoning'), false);
  assert.equal(JSON.stringify(result).includes('raw_private_field'), false);
});

test('DeepSeek rejects malformed caller messages before any network use', async () => {
  let calls = 0;
  const api = client(async () => {calls++; return response(envelope());});
  for (const input of [undefined, [], [{role: 'tool', content: 'json'}], [{role: 'system', content: 'no format specified'}], [{role: 'user', content: 3}], [{role: 'user', content: 'json' + '字'.repeat(40000)}]]) {
    await fails('AI_CONFIG_INVALID', () => api.respond({messages: input}));
  }
  await fails('AI_CONFIG_INVALID', () => api.respond({messages: [{role: 'system', content: 'json' + '字'.repeat(39000)}]}));
  await fails('AI_CONFIG_INVALID', () => api.respond({messages, signal: {}}));
  assert.equal(calls, 0);
});

test('DeepSeek rejects empty, truncated, tool and non-object JSON completions', async () => {
  const choice = (finish_reason, content, extra = {}) => [{finish_reason, message: {role: 'assistant', content, ...extra}}];
  for (const data of [
    {}, [], envelope({choices: []}), envelope({choices: [{finish_reason: 'stop', message: null}]}),
    envelope({choices: choice('length', '{"answer":"partial"}')}),
    envelope({choices: choice('content_filter', '{}')}),
    envelope({choices: choice('insufficient_system_resource', '{}')}),
    envelope({choices: choice('stop', '')}), envelope({choices: choice('stop', '   ')}),
    envelope({choices: choice('stop', '{bad json}')}), envelope({choices: choice('stop', '[]')}),
    envelope({choices: choice('stop', 'null')}), envelope({choices: choice('stop', '"text"')}),
    envelope({choices: choice('tool_calls', null, {tool_calls: [{function: {name: 'apply_plan'}}]})}),
    envelope({choices: choice('stop', '{}', {tool_calls: [{function: {name: 'apply_plan'}}]})}),
  ]) await fails('AI_INVALID_RESPONSE', () => client(async () => response(data)).respond({messages}));
});

test('DeepSeek bounds declared and streamed body bytes, rejects HTML, and cancels oversize streams', async () => {
  const options = {apiKey: 'key', model: 'explicit-model', maxResponseBytes: 1024};
  await fails('AI_INVALID_RESPONSE', () => createDeepSeekClient({...options, fetchImpl: async () => response(envelope(), {headers: {'Content-Type': 'application/json', 'Content-Length': '1025'}})}).respond({messages}));
  let cancelled = false;
  const stream = new ReadableStream({pull(controller) {controller.enqueue(new Uint8Array(600));}, cancel() {cancelled = true;}});
  await fails('AI_INVALID_RESPONSE', () => createDeepSeekClient({...options, fetchImpl: async () => new Response(stream, {headers: {'Content-Type': 'application/json'}})}).respond({messages}));
  assert.equal(cancelled, true);
  for (const invalid of [new Response('<html>secret</html>', {headers: {'Content-Type': 'text/html'}}), new Response('not json', {headers: {'Content-Type': 'application/json'}}), new Response(null, {headers: {'Content-Type': 'application/json'}})]) {
    await fails('AI_INVALID_RESPONSE', () => client(async () => invalid).respond({messages}));
  }
});

test('DeepSeek provider failures are sanitized and never retried automatically', async () => {
  for (const status of [301, 400, 401, 402, 422, 429, 500, 503]) {
    let calls = 0;
    await fails('AI_PROVIDER_UNAVAILABLE', () => client(async () => {calls++; return response({error: 'test-key-never-log and private resume'}, {status});}).respond({messages}));
    assert.equal(calls, 1);
  }
  await fails('AI_PROVIDER_UNAVAILABLE', () => client(async () => {throw new Error('test-key-never-log and private resume');}).respond({messages}));
  await fails('AI_PROVIDER_UNAVAILABLE', () => client(async () => ({ok: true, redirected: true, url: 'https://evil.test/'})).respond({messages}));
  await fails('AI_PROVIDER_UNAVAILABLE', () => client(async () => ({ok: true, redirected: false, url: 'https://evil.test/'})).respond({messages}));
});

test('DeepSeek times out stalled fetch and stalled response bodies, including injected clients ignoring abort', async () => {
  const options = {apiKey: 'key', model: 'explicit-model', timeoutMs: 15};
  await fails('AI_TIMEOUT', () => createDeepSeekClient({...options, fetchImpl: () => new Promise(() => {})}).respond({messages}));
  const neverEnding = new ReadableStream({start(controller) {controller.enqueue(new TextEncoder().encode('{'));}});
  await fails('AI_TIMEOUT', () => createDeepSeekClient({...options, fetchImpl: async () => new Response(neverEnding, {headers: {'Content-Type': 'application/json'}})}).respond({messages}));
});

test('DeepSeek honors caller cancellation before and during a request', async () => {
  let calls = 0;
  const api = client(async () => {calls++; return new Promise(() => {});});
  const before = new AbortController();before.abort();
  await fails('AI_PROVIDER_UNAVAILABLE', () => api.respond({messages, signal: before.signal}));
  assert.equal(calls, 0);
  const during = new AbortController();
  const pending = api.respond({messages, signal: during.signal});during.abort();
  await fails('AI_PROVIDER_UNAVAILABLE', () => pending);
  assert.equal(calls, 1);
});

test('DeepSeek records unavailable usage/model metadata without fabricating it', async () => {
  const result = await client(async () => response(envelope({model: null, usage: {prompt_tokens: -1, completion_tokens: '20', total_tokens: 1.5}}))).respond({messages});
  assert.equal(result.usage, null);
  assert.equal(result.providerActualModel, null);
  assert.equal(result.configuredModel, 'configured-model-alias');
});
