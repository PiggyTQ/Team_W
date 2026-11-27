# Analysis delivery under change — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| versions | array (2 rows) | ordered fixture / 固定顺序 |
| versions[].version | string | v1 |
| versions[].unit | string | yuan |
| versions[].rows | array (2 rows) | ordered fixture / 固定顺序 |
| versions[].rows[].id | string | E1 |
| versions[].rows[].status | string | active |
| versions[].rows[].amount | number | 120 |

## Judgment / 判断要求
新字段出现但旧查询静默输出旧指标，必须提示或拒绝误用
Treating yuan as cents silently changes the monetary scale.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
