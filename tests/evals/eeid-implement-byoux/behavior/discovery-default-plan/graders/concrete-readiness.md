---
type: llm
focus: last_message
---

The answer proposes a concrete default setup/readiness plan based on the
bundled baseline rather than demanding approval paperwork. It starts with
missing external tenant ID and domain/integration values before detailed
page design, distinguishing the authentication custom-domain authority,
hosted login-page URL, and relying-party callback. It does not ask again for
a value it claims to have discovered.

It asks for missing required values in plain language with a short purpose,
not "supply the tenant GUID or enter tenant-independent plan," an alternate
mode picker, or a magic phrase to bypass the input. A general explanation is
appropriate here because the customer explicitly requested a plan, not because
the agent diverted ordinary onboarding into a special no-tenant mode.

Only tenant ID, application/client ID, custom authentication domain, and
loginPageUrl may pause discovery. Other questions have recommended defaults;
Object ID, flow ID, access, approval artifacts, and schemas are not extra
required answers. The application Object ID is a later lookup/manual task.
It places inspection of web.customAuthenticationUx immediately after the four
inputs and before page design, defaulting the proposed manual setup to enabled
with the supplied login URL. It does not make "Enable BYOUX?" another gate;
actual mutation waits for a deployed endpoint, verified domains, and an
authorized administrator.

It describes later permission-based, read-only discovery of verified domains,
attribute catalog/selected-flow configuration, and Conditional Access policies
without claiming to have contacted this tenant. It offers manual inspection
or an authorized administrator's export when access is unavailable and never
asks for a pasted token or treats failed reads as empty results.

The default for a fresh page is plain HTML/CSS/JavaScript modules with a
POST-capable host, not a static GET-only file, mandatory framework, or
standalone Native Auth sign-in. It offers sign-in, signup, and password reset
when password authentication is enabled; social federation is not selectable.

It derives MFA from applicable enforced policy and actual service responses,
not an always-MFA assumption for consumers or an enable/disable questionnaire.
Disabled/report-only policies do not enforce MFA, and a policy listing alone
does not establish effective requirements for every user/transaction.

The plan marks configuration checks confirmed or pending with concrete next
actions. The explicit dry-run continues without a new mode/approval answer;
unavailable schemas, reads, and live checks remain pending, not extra discovery
gates. It does not guess schemas, equate a baseline or saved setting with
tenant enablement/live success, offer a generic forwarding proxy, modify
tenant settings, or claim live authentication has been verified.
