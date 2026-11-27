# Data workbench and API faults — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| rows | array (12 rows) | ordered fixture / 固定顺序 |
| rows[].id | number | 1 |
| rows[].group | string | A |
| currentFilter | string | B |
| page | number | 2 |
| pageSize | number | 3 |
| responses | array (2 rows) | ordered fixture / 固定顺序 |
| responses[].id | string | late-A |
| responses[].query | string | A |

## Judgment / 判断要求
快速改变筛选造成旧结果覆盖，应在测试中失败
An earlier request must not replace results for the new filter.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
