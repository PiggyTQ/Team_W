# Migration reconciliation

行数相等但关键状态错误，或新数据回退丢失，必须失败

Equal row counts do not excuse a wrong status or loss of new records.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
