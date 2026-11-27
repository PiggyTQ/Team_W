# Analysis delivery under change

新字段出现但旧查询静默输出旧指标，必须提示或拒绝误用

Treating yuan as cents silently changes the monetary scale.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
