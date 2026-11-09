---
description: "Should not trigger: browser-redirect MSAL sign-in."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Add a "Sign in with Microsoft" button to my React app. Use MSAL.js with
loginRedirect against our Entra External ID tenant. Just show me the code I
need for the button and the MSAL configuration.
