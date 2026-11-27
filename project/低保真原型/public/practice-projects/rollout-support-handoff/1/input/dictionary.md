# Rollout and support handoff — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| checks | array (3 rows) | ordered fixture / 固定顺序 |
| checks[].id | string | core |
| checks[].required | boolean | true |
| checks[].status | string | passed |
| delta | array (1 rows) | ordered fixture / 固定顺序 |
| delta[].id | string | POST-CUTOVER-1 |
| support.owner | string | exercise-support-role |
| training | array (2 rows) | ordered fixture / 固定顺序 |
| training[].role | string | member |
| training[].scenario | string | register-and-cancel |

## Judgment / 判断要求
未测必需功能被写通过或没有新增数据处理应失败
A required not-run check blocks rollout even when optional checks pass.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
