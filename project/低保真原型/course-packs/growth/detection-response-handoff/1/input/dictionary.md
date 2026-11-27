# Detection and response handoff — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| events | array (6 rows) | ordered fixture / 固定顺序 |
| events[].id | string | F1 |
| events[].kind | string | login-failure |
| events[].user | string | u1 |
| events[].device | string | a |
| events[].minute | number | 1 |
| labels | array (1 rows) | ordered fixture / 固定顺序 |
| labels[] | string | S1 |
| approvedDevices | array (1 rows) | ordered fixture / 固定顺序 |
| approvedDevices[] | string | a |
| timezone | string | UTC+08:00 |

## Judgment / 判断要求
全部事件都报异常以换取命中率，应在误报/范围检查中暴露
Marking every successful login suspicious produces false positives.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
