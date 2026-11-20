# BYOUX user-flow setup

Read discovery and manual setup when planning tenant prerequisites. Read the
automation sections only when the customer explicitly requests user-flow
automation. This reference is self-contained; do not invoke Web/Native onboarding
or require another skill, checkout, or retained provisioning script.

## Contents

- Discover and select
- Manual setup by default
- Optional automation scope and approval
- Plan, apply, verify, and roll back
- Execution status and handoff
- Public API references

## Discover and select

Use authorized reads from `tenant-and-registration.md`, including pagination
and each candidate flow's application-association collection. Match the target
tenant and application/client ID, not application Object ID or display name alone.
Record inventory as read, unread/failed, or ambiguous, separately from the result.

| Observed state | Plan |
|---|---|
| Application already associated with a compatible flow | Reuse its stable ID and configuration; matching settings need no update |
| No association, but a compatible flow is identified | Propose adding this application while preserving existing associations; do not select an arbitrary flow by name |
| Reads confirm no suitable flow | Propose a named sign-up/sign-in flow with selected/defaulted factors and attributes, then associate the application |
| Reads unavailable, failed, incomplete, or multiple candidates unresolved | Mark selection/creation pending; provide conditional manual instructions and continue page work, never treat this as confirmed absence |

Prefer the associated flow, then an explicitly identified flow. A name lookup
must yield one compatible match before using it as an update target. Duplicate
names or conflicting IDs require resolution for that write, not a fifth required
discovery input. A proposed name is not an existing flow ID.

An application can belong to only one user flow; multiple applications can share
a flow. Never silently detach/rebind an application or change factors/attributes
for other applications sharing a flow. Report that impact for separate review.
Do not create a duplicate on every run or infer compatibility from a name alone.

Carry the journey and attribute summary from `ciam-user-flows.md`: exact
built-in/custom IDs when resolved, types, requiredness, validation/options,
collection preference, and separately selected claims. Preserve identity/policy
requirements. Flow configuration does not establish support for arbitrary early
Native API submission or a post-completion attribute screen.

## Manual setup by default

Provide Action/Why/Expected result/Verify and a scoped rollback for each
applicable step. Skip creation when reusing an existing flow.

1. **Action:** In the target external tenant, open **Entra ID > External
   Identities > User flows**. Inspect the intended flow or select **New user
   flow** and enter a proposed name for the sign-up/sign-in journey.
   **Why:** A registration alone does not establish a customer journey.
   **Expected result:** The intended existing flow or a prepared creation form;
   record an actual new flow ID only after saving the configured flow.
   **Verify:** Confirm tenant, flow type, selected journeys, and absence of an
   unintended duplicate. If sign-up is excluded, verify the supported restriction
   before creation; do not silently enable account creation.
2. **Action:** Select **Email Accounts** and the chosen **Email with password**
   or **Email one-time passcode** option. For a confirmed new flow without a
   preference, recommend Email + password as proposed setup, not an enabled fact.
   Keep any tenant-level method prerequisite pending for the administrator.
   **Why:** The first factor determines available recovery and MFA combinations.
   **Expected result:** The selected supported factor, without added federation
   or an invented MFA method.
   **Verify:** Compare with `byo-ux.md` and existing policy. Keep MFA/SSPR policy
   changes separate; flow creation alone does not enable them.
3. **Action:** Under **User attributes**, select the requested built-in/custom
   definitions. Have the administrator define missing custom attributes through
   the documented procedure before selecting them. Review the flow's attribute
   collection settings for labels, order, and required/optional preferences,
   then create/save the configured flow.
   **Why:** The hosted page and configured collection must agree.
   **Expected result:** The requested resolved fields and supported input
   configuration, with unsupported/unresolved items explicitly pending.
   **Verify:** Read back IDs and input requirements; preserve existing fields,
   identity requirements, and unrelated claims. Do not invent a portal control
   for timing; implement the page preference only through supported operations.
4. **Action:** Open the flow's **Applications > Add application**, select the
   relying-party registration, and save if it is not already associated.
   **Why:** Binds this application's requests to the intended journey.
   **Expected result:** The target client ID appears in this flow's associations.
   **Verify:** Read the association collection and preserve other applications.
   A different existing association needs separate review, not automatic removal.

Before changes, capture the affected settings and associations. For rollback,
restore only this work's changes after review, preserving later administrator
edits; never delete a reused flow or the application. Verify BYOUX separately
through application-initiated authorize, hosted-page interactions, finish, and
validated callback. **Run user flow** alone is not end-to-end BYOUX evidence.

## Optional automation scope and approval

Do not offer automation as a new required discovery question. Default to the
manual path and continue if no automation request/approval arrives.

On explicit request, prepare a flow-only plan. In authorized implementation
mode, generate runnable automation in the customer's workspace using their
approved Graph client/SDK; in Dry-run return the plan without creating files.
Run it only as administrator-side tooling, never in the hosted login page or
browser bundle.
Do not merely refer to unavailable sibling scripts or claim that a plan is an
implemented/tested provisioning tool.

Limit writes to a sign-up/sign-in flow, documented supported flow configuration,
and association of the existing relying-party application. Exclude tenant/app
creation, service-principal creation, credentials, consent/role grants, domain
setup, custom attribute-definition creation, authentication-method policy,
Conditional Access, and BYOUX beta application enablement/removal. Missing
prerequisites remain manual; never widen a batch to fix them automatically.

Use documented Microsoft Graph v1.0 APIs for the tenant's supported cloud:

| Operation | Path below `/v1.0` |
|---|---|
| Plan/read inventory | `GET /identity/authenticationEventsFlows` |
| Read/update the selected flow | `GET` / `PATCH /identity/authenticationEventsFlows/{flow-id}` |
| Create a confirmed-missing flow | `POST /identity/authenticationEventsFlows` |
| Read/add an application association | `GET` / `POST /identity/authenticationEventsFlows/{flow-id}/conditions/applications/includeApplications` |

Use `#microsoft.graph.externalUsersSelfServiceSignUpEventsFlow` for the
flow's `@odata.type`. Association POSTs use the application's client `appId`,
not its application/service-principal Object ID. Resolve the existing service
principal prerequisite without creating one as a side effect.

For writes, document `EventListener.ReadWrite.All` and the API's supported
authorization; delegated access supports External ID User Flow Administrator
as its least-privileged role. Do not require Global Administrator for these
flow operations or ask the customer to paste tokens. Validate the authenticated
tenant using approved tooling; permission failure blocks writes, not page work.

Map only documented, resolved configuration. Do not substitute email plus an
optional display-name sample for selected attributes. For an existing flow,
adding/removing attributes requires the dedicated documented attribute APIs,
not a PATCH to `attributes` or `views.inputs`. An input-layout update must
preserve the complete existing input collection, including unchanged inputs.
If the exact operation/mapping is unverified, leave that change manual and split
any supported subset into an explicitly identified, separately approved batch.
Never silently drop a requested custom field or claim a partial batch is complete.

## Plan, apply, verify, and roll back

1. **Plan read-only.** Record tenant/client IDs, discovered flow ID or proposed
   name, create/update/no-op decisions, exact methods/paths/bodies, before/after
   diff, existing associations, selected factors/attributes, manual remainder,
   impact on shared applications, verification, and rollback. Preserve unrelated
   configuration. Bind approval to SHA-256 hashes of the exact plan artifact and
   desired configuration, without storing credentials or customer profile data.
2. **Require execution approval.** Show the plan and offer **Execute this
   supported user-flow batch** or **Guide me manually (default)**. Only explicit
   approval of that exact batch authorizes writes. A request to automate, prior
   approval, plan generation, or approval of page edits is not execution approval.
   If unanswered, continue supported application work and leave writes pending.
3. **Revalidate before apply.** Check hashes, authenticated tenant, target IDs,
   current flow settings/associations, and lookup uniqueness. A flow appearing
   after a create plan, conflicting association, duplicate name, or changed
   snapshot invalidates the plan: re-plan and obtain fresh approval. Repeated
   runs must detect already-matching configuration and association as no-ops.
4. **Apply the bounded batch.** Use minimal documented requests; prefer the
   association-add operation over replacing all application conditions. Preserve
   existing factors, inputs, extensions, and application links unless their exact
   change and shared impact were approved. Checkpoint affected preimages and each
   successful mutation's returned identifiers in an approved local location.
   Surface errors and partial completion, stop dependent writes, and print
   recovery steps. After an ambiguous POST outcome, reconcile inventory before
   any retry; do not create a duplicate or claim transactional/atomic execution.
5. **Verify configuration.** Read back flow type, selected settings, exact
   attribute IDs/requirements, and client-ID association, including preserved
   unrelated configuration. Report Passed/Failed/Not run separately from the
   manual remainder and live BYOUX tests. A 201/204 or passing mock is insufficient.
6. **Roll back only with approval.** Use recorded IDs/preimages; remove only
   associations added by this run and restore only managed fields after checking
   for intervening edits. Delete a flow created by this run only when no unrelated
   associations/dependencies or subsequent changes would be lost. Never delete
   a reused flow, search-and-delete by name, or remove the application. Report
   partial rollback and verify afterward; do not promise rollback is atomic.

## Execution status and handoff

Treat generated sign-in/signup/SSPR/MFA views as application work, not proof a
tenant user flow was created. Inspect the current run's authorized operation
results and setup artifacts before answering whether provisioning ran; if no
execution evidence is available, report unknown, not executed or absent.

Report each stage separately:

| Stage | Evidence/status |
|---|---|
| Discovery and selection | Read/unread/failed/ambiguous; selected stable flow ID or proposed name |
| Setup path | Manual default or explicitly requested automation |
| Plan/tool generation | Not generated, plan generated, or runnable tooling generated; none implies execution |
| Tenant mutations | Not executed, attempted/failed, partially applied, created/updated, or no-op, tied to actual operation evidence |
| Application association | Unread, pending, already associated, added, failed, or conflicting; identify client ID and flow ID when known |
| Configuration read-back | Passed/Failed/Not run with the exact checked settings and unresolved remainder |
| Live BYOUX journey | Passed/Failed/Not run separately from configuration and synthetic UI tests |

For manual instructions not performed by the agent or confirmed by an
administrator, say **No tenant user flow was created or associated by this
run; manual setup remains pending.** If inventory is unread, creation remains
conditional, not an instruction to create blindly. A JSON plan, proposed name,
generated helper, HTTP mutation success alone, or passing page tests cannot
advance the unverified stages. Do not request write permission as an extra
page-generation gate; identify the pending manual action without claiming it ran.

## Public API references

- [Create a user flow](https://learn.microsoft.com/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers).
- [Associate an application](https://learn.microsoft.com/entra/external-id/customers/how-to-user-flow-add-application).
- [Create a Graph user flow](https://learn.microsoft.com/graph/api/identitycontainer-post-authenticationeventsflows?view=graph-rest-1.0).
- [Update a Graph user flow and attribute-layout restrictions](https://learn.microsoft.com/graph/api/authenticationeventsflow-update?view=graph-rest-1.0).
- [List application associations](https://learn.microsoft.com/graph/api/authenticationconditionsapplications-list-includeapplications?view=graph-rest-1.0).
- [Add an application association](https://learn.microsoft.com/graph/api/authenticationconditionsapplications-post-includeapplications?view=graph-rest-1.0).
