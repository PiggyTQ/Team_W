# Migration launch collaboration

行数相同但状态映射错误或回退丢新增记录应阻断

A rollback that discards the new records must be blocked.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
