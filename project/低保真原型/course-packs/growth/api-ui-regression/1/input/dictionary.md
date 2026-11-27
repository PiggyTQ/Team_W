# API and UI regression — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| tests | array (3 rows) | ordered fixture / 固定顺序 |
| tests[].id | string | other-object |
| tests[].expected | number | 403 |
| tests[].broken | number | 200 |
| tests[].version | string | bug-1 |
| tests[].action | string | read-object |
| tests[].user | string | bob |
| tests[].owner | string | alice |

## Judgment / 判断要求
测试只查HTTP200或界面标题而漏关键行为应暴露
A blanket passed label conceals a failing case in the broken version.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
