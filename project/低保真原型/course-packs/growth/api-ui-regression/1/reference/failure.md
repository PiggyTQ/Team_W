# API and UI regression

测试只查HTTP200或界面标题而漏关键行为应暴露

A blanket passed label conceals a failing case in the broken version.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
