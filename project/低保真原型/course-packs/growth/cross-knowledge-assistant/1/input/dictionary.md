# Knowledge assistant collaboration — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| documents | array (2 rows) | ordered fixture / 固定顺序 |
| documents[].id | string | D1 |
| documents[].version | number | 1 |
| documents[].roles | array (1 rows) | ordered fixture / 固定顺序 |
| documents[].roles[] | string | member |
| documents[].fact | string | checkin |
| documents[].value | string | 09:00–09:30 |
| questions | array (4 rows) | ordered fixture / 固定顺序 |
| questions[].id | string | Q1 |
| questions[].role | string | member |
| questions[].document | string | D1 |
| questions[].version | number | 1 |
| questions[].fact | string | checkin |
| revision | number | 2 |

## Judgment / 判断要求
不可访问资料被用来回答即使文本正确也必须失败
A private source must not enter a member answer.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
