# Service evolution and migration

只按空库测试导致旧数据迁移失败必须暴露

Changing the old client to cents without a version change breaks compatibility.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
