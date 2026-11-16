# Evals: eeid-onboarding

See the shared eval README for execution and the explicit three-skill launch
composition profile. BYOUX is not installed.

| Case | Type | Expected behavior |
| --- | --- | --- |
| onboard-trigger-choose-approach | Triggering | Load for an External ID approach-selection request |
| onboard-no-trigger-copy-edit | Triggering | Rewrite documentation without starting onboarding |
| onboard-behavior-recommend | Behavior | Recommend Microsoft-hosted for the server fixture, then wait for a choice |
| onboard-behavior-other | Behavior | Explain the naming distinction and remain on decisioning |
| onboard-behavior-launch-paths | Behavior | Offer only Web and Native on initial launch |
| onboard-behavior-excluded-paths | Behavior | Block explicit BYOUX/Custom HTML requests without handoff |
| onboard-behavior-web-handoff | Behavior | Invoke only hosted implementation and preserve the confirmed dry-run scope |
| onboard-behavior-native-handoff | Behavior | Invoke only Native V2 implementation and preserve the confirmed scope |

The native handoff uses the `react` fixture; the other behavior cases use
`server`. Implementation skill invocation is approved only in the two handoff
cases. No application or tenant mutations are approved by this suite.
