# Alert rules and counterexamples

计数器重置或低请求量误触发，回归必须捕获

Counting a short spike as a sustained alert violates the duration requirement.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
