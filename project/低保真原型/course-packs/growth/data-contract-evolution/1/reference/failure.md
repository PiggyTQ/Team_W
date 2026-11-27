# Data contract evolution

字段改名后静默全空或回填覆盖增量应失败

Using only the new field loses historical amounts.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
