---
description: "Page design discovers what, when, and conditions; v2 supports early attributes."
tags: [behavior]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux. BYOUX signup is selected, our preview eligibility
and contract are approved, and we are still designing the login page.
The approved v2 contract accepts configured profile attributes on supported
earlier signup calls as well as a later attribute-submission action.
I think we might want display name and a custom membership field, but have
not decided when to ask or which customers need them. We can inspect the
actual field definitions later.

I would prefer choosing from built-in/custom attributes rather than typing
names. After selection, I need a clear required/optional question, separate
from whether the definitions were checked against my tenant. Keep timing to
upfront signup details or after identity verification, not split/custom timing.

What must you confirm with me before generating signup UI, and what can we
do if you cannot read my tenant's catalog yet? Explain whether we must wait
for collectAttributes. Don't assume the IDs, write code, or collect real
customer values.
