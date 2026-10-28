# Plugin publishing guide

How to prepare and publish the Microsoft Entra External ID Agent Skills
toolkit plugin to popular coding assistant marketplaces.

> **Draft.** Researched in October 2026 from each marketplace's
> documentation. These processes are new and change often; re-check the
> linked docs before each submission.

## 1. Shared preparation

### 1.1 Make the repository publishable

1. **Make the repository public.** Every marketplace requires a public GitHub
   repository. The Claude directory lets a repository stay private during
   validation, but it must be public before the listing goes live. Decide
   the final organization and name through Microsoft's open-source release
   process.
2. **Add standard files:** `LICENSE` (MIT), a customer-facing `README.md`
   (marketplaces build listings from it), `SECURITY.md`, `SUPPORT.md`, and a
   privacy statement link.
3. **Publish immutable releases.** Tag each version (for example `v1.0.0`).
   Awesome Copilot requires a release tag plus its full commit SHA.

### 1.2 Make the content release-ready

4. **Replace demo shortcuts.** Remove `[DEMO]` validation and security
   content from the migration skill's report template and run real checks.
5. **Clear private-preview content.** The migration skill's V2 references
   come from private-preview documentation. Publish them only after V2 is
   public or with approval.
6. **Set `metadata.status: ready`** for each released skill and make sure
   `npm run validate:release` passes.
7. **Test in every target assistant:** install the plugin, confirm skills
   activate from natural-language requests, and run the demo migration.
   Marketplace reviews check packaging and safety, not whether the skill
   works.

### 1.3 Build listing assets once

8. **Metadata:** display name, one-line description, long description,
   category, keywords, version, and publisher (Microsoft).
9. **Visual assets:** logo and icon (OpenAI requires `logo` and
   `composerIcon`), plus screenshots or a demo video.
10. **Links:** website (the Microsoft Learn page), support, privacy policy,
    and terms of use.

### 1.4 Generate assistant manifests

11. The root `plugin.json` (Agent Plugins format) is the source of truth.
    Copilot, Cursor, and Codex can read it directly. Claude Code needs
    `.claude-plugin/plugin.json`; Codex can also use
    `.codex-plugin/plugin.json` for its presentation fields.
12. Generate these from the root manifest (the deferred
    `packaging/adapters/` work) and check for drift in a release PR.

### 1.5 Microsoft approvals

13. **Legal review** of each marketplace's developer terms, which publishing
    accepts on Microsoft's behalf.
14. **Publisher identity.** Decide which Microsoft account or organization
    owns each listing. OpenAI requires a verified organization. The Claude
    directory accepts one submission per repository folder, so the first
    submitter owns the listing.
15. **Security and privacy review.** Marketplaces ask how personal data is
    handled; someone must answer formally.
16. **An update owner.** Each new version is re-reviewed (Cursor reviews
    every update), and Awesome Copilot re-reviews listings about every six
    months.

## 2. Marketplace steps

### 2.1 Skills CLI and skills.sh (all assistants that support Agent Skills)

- **Effort:** lowest; no review.
- **Steps:** once the repository is public, customers install with
  `npx skills add <owner/repo>`, or add `--skill <skill-name>` for one skill.
- **Listing:** no submission form was found for [skills.sh](https://skills.sh).
  Its directory appears to be built from CLI installs. Confirm before relying
  on it.

### 2.2 Awesome Copilot (GitHub Copilot in VS Code and Copilot CLI)

- **Route:** an **external plugin**, because the toolkit is hosted in its own
  repository. Don't open a PR that edits their catalog.
- **Steps:**
  1. Open an external plugin submission issue in
     [github/awesome-copilot](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md)
     using their form.
  2. Provide the public repository, a release tag, and the full 40-character
     commit SHA.
  3. Automated checks run: metadata intake, `vally lint`, and an install
     smoke test.
  4. A maintainer approves or rejects. Listings are re-reviewed about every
     six months.
- **Prepare:** test with `copilot plugin marketplace add <owner/repo>` first.
- **Without a listing:** customers can add the repository as a marketplace
  themselves with the same command.

### 2.3 Claude plugin directory (Claude Code)

1. Add `.claude-plugin/plugin.json` and run
   `claude plugin validate ./<plugin-folder>` locally.
2. Connect a GitHub account with push access to the repository, then open
   the developer portal at
   [claude.ai/directory/manage](https://claude.ai/directory/manage).
3. Select **Submit new → Plugin bundle** and enter the repository and plugin
   path. Fix any validation findings and revalidate.
4. Review the listing, which is generated from `plugin.json` and the README.
5. Answer the **data handling** questions and accept the **compliance**
   acknowledgements.
6. Choose how updates arrive (GitHub push webhook or scheduled check), then
   **Submit for review**.
7. Each version is security-scanned and may be held for a human reviewer.
   Publish it after it passes.

**Limits:** one submission per repository folder; 10 submissions per
organization per 24 hours. Docs:
[Submit plugins](https://www.claude.com/docs/plugins/submit).

### 2.4 Cursor Marketplace (Cursor)

1. Use the root `plugin.json` (Agent Plugins format with `$schema`, `name`,
   `description`, `version`, `author`) and `skills/`.
2. Test locally: copy the plugin to `~/.cursor/plugins/local/<name>`, reload
   Cursor, and check it under **Customize**.
3. Submit the Git repository at
   [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).

**Review:** plugins must be open source; every plugin and every update is
reviewed manually. Docs: [Cursor plugins](https://cursor.com/docs/plugins).

### 2.5 ChatGPT and Codex plugin directory (OpenAI Codex)

- **Prepare:**
  - A verified OpenAI organization (individual or business verification).
  - A submitter who is an organization owner or has **Apps Management Write**.
  - A manifest: root `plugin.json` with `extensions.com.openai`, or
    `.codex-plugin/plugin.json`.
  - Required fields: `displayName`, `shortDescription`, `longDescription`,
    `developerName`, `category`, plus icons (`logo`, `composerIcon`).
- **Steps:**
  1. In the OpenAI Platform, select **Plugins → Upload new or existing
     plugin** and upload the plugin as a ZIP with no credentials in it.
  2. Fix any metadata and skill findings.
  3. Complete the review details and policy attestations, then **Submit for
     review**.
  4. After approval, choose when to publish.
- **Skills-only plugins:** allowed. The MCP checks, test cases, and demo
  video apply only to plugins with MCP servers.
- **Updates:** any change to skills or metadata needs a new ZIP and review.
- **Docs:** [Build plugins](https://developers.openai.com/plugins/build/plugins),
  [Submit plugins](https://developers.openai.com/plugins/deploy/submission).

## 3. Recommended order

| Order | Channel | Why |
| --- | --- | --- |
| 1 | Public repository + Skills CLI | No review, works everywhere, and every other channel needs the public repository |
| 2 | Awesome Copilot | Copilot is the first validated assistant, and review is mostly automated |
| 3 | Claude plugin directory | Self-service portal with clear validation |
| 4 | Cursor Marketplace | Simple submission, but manual review of every update |
| 5 | ChatGPT and Codex | Most setup: organization verification, ZIP upload, re-review for every change |

## 4. Biggest open work items

- Real validation and security checks in the migration skill (1.2, item 4).
- Publishable V2 reference content (1.2, item 5).
- Manifest generation for each assistant (1.4).
- Legal review of marketplace terms and publisher identity (1.5).

## References

- [Submit plugins (Claude)](https://www.claude.com/docs/plugins/submit)
- [Discover plugins (Claude Code)](https://code.claude.com/docs/en/discover-plugins)
- [awesome-copilot CONTRIBUTING.md](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md)
- [Installing and using plugins (Awesome Copilot)](https://awesome-copilot.github.com/learning-hub/installing-and-using-plugins/)
- [About plugins (GitHub Copilot)](https://docs.github.com/en/copilot/concepts/agents/about-plugins)
- [Cursor plugins](https://cursor.com/docs/plugins)
- [Plugins (ChatGPT and Codex)](https://learn.chatgpt.com/docs/plugins)
- [Submit plugins (OpenAI)](https://developers.openai.com/plugins/deploy/submission)
- [Agent Skills (Vercel)](https://vercel.com/docs/agent-resources/skills)
