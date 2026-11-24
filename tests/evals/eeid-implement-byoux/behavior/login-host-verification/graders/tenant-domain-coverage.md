---
type: llm
focus: last_message
---

The answer accepts domain ownership for login.customer.example because the
target tenant owns DNS-verified customer.example. It does not demand separate
verification or a separate verified-domain entry for the child. Verification
of that child elsewhere does not negate coverage by this tenant's parent.

It also accepts customer.example itself, signin.login.customer.example, and
the case-varied LOGIN.CUSTOMER.EXAMPLE after normalization. The comparison
uses exact equality or a dot-delimited child-domain boundary, never bare suffix,
substring, or wildcard matching. It rejects evilcustomer.example and
customer.example.evil.test.

In the variant with no verified covering parent or exact login-domain entry
in this tenant, the unrelated auth.customer.example sibling and another
tenant's login-domain verification do not establish coverage. It leaves
that variant's enablement pending for manual domain verification while
continuing supported planning. It never rewrites the host or spoofs Origin/Host.

Domain eligibility is not proof of deployment or live authentication. Other
requirements still apply: absolute HTTPS, DNS hostname, no IP literal,
localhost, loopback, Microsoft-owned host, user information, or fragment.
It preserves distinct page/service hosts and leaves remaining deployment,
finish/callback, and live checks explicit without writes, role changes,
another discovery gate, or a redundant PATCH when saved settings match.
