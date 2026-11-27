# Partition replay and publishing

行数相同但关键字段变化必须失败

Appending a replay duplicates a record instead of replacing the partition.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
