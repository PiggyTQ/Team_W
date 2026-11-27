# Accessible form and state recovery

等待时改输入，旧请求结果不能覆盖新输入

A late response must not overwrite an edited input or clear it after failure.

Compare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.
