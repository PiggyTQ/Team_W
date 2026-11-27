# Legacy change and refactoring

只通过新用例却破坏旧调用方应失败

Applying membership before the fixed discount changes the promised price.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
