# Multi-source business analysis — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| orders | array (3 rows) | ordered fixture / 固定顺序 |
| orders[].id | string | A1 |
| orders[].customer | string | C1 |
| orders[].channel | string | web |
| orders[].cents | number | 12000 |
| payments | array (3 rows) | ordered fixture / 固定顺序 |
| payments[].id | string | P1 |
| payments[].order | string | A1 |
| payments[].cents | number | 6000 |
| customers | array (3 rows) | ordered fixture / 固定顺序 |
| customers[].id | string | C1 |

## Judgment / 判断要求
故意一对多连接导致重复累计，检查必须捕获
Duplicating the order amount for each payment inflates the first order.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
