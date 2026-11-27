# Reproducible defect evidence — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| cases | array (4 rows) | ordered fixture / 固定顺序 |
| cases[].id | string | C0 |
| cases[].cents | number | 0 |
| cases[].version | string | bug-1 |

## Judgment / 判断要求
只报告截图而没有输入/版本/预期不能通过复现检查
Rounding to whole yuan before the boundary test misclassifies an amount below 8000.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
