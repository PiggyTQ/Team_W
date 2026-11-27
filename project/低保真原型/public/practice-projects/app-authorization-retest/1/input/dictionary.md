# Application authorization retest — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| objects.O1.owner | string | alice |
| objects.O2.owner | string | bob |
| requests | array (6 rows) | ordered fixture / 固定顺序 |
| requests[].id | string | anonymous |
| requests[].user | nullable | null |
| requests[].object | string | O1 |
| requests[].action | string | read |
| requests[].scopes | array (0 rows) | ordered fixture / 固定顺序 |

## Judgment / 判断要求
只隐藏前端按钮而服务端仍返回数据，必须失败
Hiding a button leaves an unauthorized server response exposed.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
