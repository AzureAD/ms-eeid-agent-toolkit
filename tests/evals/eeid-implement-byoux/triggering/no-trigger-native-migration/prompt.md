---
description: "Should not trigger for an embedded Native Auth SDK migration."
tags: [triggering]
runs: 3
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Migrate our existing React application's embedded Native Auth SDK methods
from signIn/signUp/resetPassword to signInV2/signUpV2/resetPasswordV2.
We are not adding a centrally hosted login page or changing our OAuth topology.
Start with an assessment, not code changes.
