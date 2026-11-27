# Migration launch collaboration — input dictionary / 输入字典

Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.
本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。

| Path / 字段 | Type | Supplied example / 例值 |
|---|---|---|
| source | array (2 rows) | ordered fixture / 固定顺序 |
| source[].id | string | U1 |
| source[].email | string |  ALICE@example.invalid  |
| source[].status | string | confirmed |
| target | array (2 rows) | ordered fixture / 固定顺序 |
| target[].id | string | U1 |
| target[].email | string | alice@example.invalid |
| target[].status | string | active |
| newRecords | array (1 rows) | ordered fixture / 固定顺序 |
| newRecords[].id | string | U3 |
| newRecords[].email | string | new@example.invalid |
| newRecords[].status | string | active |
| revision | number | 2 |

## Judgment / 判断要求
行数相同但状态映射错误或回退丢新增记录应阻断
A rollback that discards the new records must be blocked.

Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.
数值仅是本教学契约；更改语义须记录新契约，不静默套用。
