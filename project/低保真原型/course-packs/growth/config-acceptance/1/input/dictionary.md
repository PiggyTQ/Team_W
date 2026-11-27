# Configuration and acceptance — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| permissions.member | array (2 rows) | ordered fixture / 固定顺序 |
| permissions.member[] | string | read |
| permissions.staff | array (3 rows) | ordered fixture / 固定顺序 |
| permissions.staff[] | string | read |
| cases | array (3 rows) | ordered fixture / 固定顺序 |
| cases[].id | string | member-export |
| cases[].role | string | member |
| cases[].action | string | export |
| cases[].expected | boolean | false |

## Judgment / 判断要求
配置满足演示却遗漏关键业务角色应捕获
Omitting a required role changes a positive acceptance case into a denial.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
