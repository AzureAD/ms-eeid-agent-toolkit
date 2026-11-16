---
type: regex
target: last_message
pattern: '4\.13[\s\S]*5\.(?:29|x)|5\.(?:29|x)[\s\S]*4\.13'
weight: 2
---
The final message names the installed version (4.13.0) and the version V2 needs (5.29.0 or later, 5.x).
