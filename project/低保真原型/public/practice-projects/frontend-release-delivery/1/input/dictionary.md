# Frontend release delivery — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| pages./list | string | items |
| pages./detail/7 | string | item-7 |
| supportedVersion | number | 2 |
| routes | array (3 rows) | ordered fixture / 固定顺序 |
| routes[].path | string | /detail/7 |
| routes[].reload | boolean | true |
| routes[].apiVersion | number | 2 |

## Judgment / 判断要求
深链接刷新或接口版本变化导致关键流程丢失应被捕获
A detail refresh using an unsupported API version must not be labelled ready.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
