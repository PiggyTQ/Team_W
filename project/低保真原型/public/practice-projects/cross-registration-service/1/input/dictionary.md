# Registration service collaboration — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| contract.version | number | 2 |
| contract.field | string | email |
| calls | array (2 rows) | ordered fixture / 固定顺序 |
| calls[].id | string | legacy |
| calls[].body.mail | string | a@example.invalid |
| revision | number | 2 |

## Judgment / 判断要求
接口字段变更不通知前端造成流程失败应在联合验收暴露
A legacy mail field sent to the email-field contract must fail joint acceptance.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
