# Retry and concurrent consistency

先返回成功后写入失败或同请求重复扣减应被捕获

Replaying a key must not reserve seats twice.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
