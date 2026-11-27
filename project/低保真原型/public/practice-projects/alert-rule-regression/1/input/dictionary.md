# Alert rules and counterexamples — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| rule.threshold | number | 0.05 |
| rule.for | number | 2 |
| rule.minRequests | number | 100 |
| rule.label | string | registration |
| windows | array (11 rows) | ordered fixture / 固定顺序 |
| windows[].minute | number | 1 |
| windows[].requests | number | 100 |
| windows[].errors | number | 1 |

## Judgment / 判断要求
计数器重置或低请求量误触发，回归必须捕获
Counting a short spike as a sustained alert violates the duration requirement.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
