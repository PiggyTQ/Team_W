# Multi-source business analysis

故意一对多连接导致重复累计，检查必须捕获

Duplicating the order amount for each payment inflates the first order.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
