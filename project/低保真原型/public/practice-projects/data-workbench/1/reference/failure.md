# Data workbench and API faults

快速改变筛选造成旧结果覆盖，应在测试中失败

An earlier request must not replace results for the new filter.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
