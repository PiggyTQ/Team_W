# Data contract evolution — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| history | array (1 rows) | ordered fixture / 固定顺序 |
| history[].id | string | H1 |
| history[].amount_cents | number | 1200 |
| increment | array (2 rows) | ordered fixture / 固定顺序 |
| increment[].id | string | N1 |
| increment[].cents | number | 801 |

## Judgment / 判断要求
字段改名后静默全空或回填覆盖增量应失败
Using only the new field loses historical amounts.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
