# OpenHands

| | |
|---|---|
| Source | https://github.com/OpenHands/OpenHands |
| Repo | https://github.com/OpenHands/OpenHands @ `ae5b8a995deb68bd00b8f3af0e87e4c2f3c580a6` |
| Kind | - |
| Topics | agent |
| License | none (forbidden) |
| Verdict | promote |
| Findings | 17 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/2 |

## Implementation decisions

<a id="g2-f001"></a>
### The agent runtime has been extracted out of this repo into three pinned PyPI packages ( openhands-sdk , openhands-agent-server , openhands-tools , all ==1.30.0 )

`pyproject.toml:61-62` @ ae5b8a9

The agent runtime has been extracted out of this repo into three pinned PyPI packages (`openhands-sdk`, `openhands-agent-server`, `openhands-tools`, all `==1.30.0`); this repo (`openhands-ai`) is now the *application server* that orchestrates conversations, sandboxes, git, and MCP rather than owning the agent loop. `pyproject.toml:61-62 `

<a id="g2-f002"></a>
### litellm and openai are pinned to *exact* versions with inline rationale: a floor would…

`pyproject.toml:163-164` @ ae5b8a9

`litellm` and `openai` are pinned to *exact* versions with inline rationale: a floor would let an untested version slip in, and litellm 1.84.1 requires openai 2.33.0. `pyproject.toml:163-164 `

<a id="g2-f003"></a>
### Each conversation runs against its own sandboxed agent-server

`openhands/app_server/sandbox/docker_sandbox_service.py:414-421` @ ae5b8a9

Each conversation runs against its own sandboxed agent-server; the app-server generates a per-sandbox `session_api_key` (base62 of 32 random bytes) and injects it plus a webhook callback URL as indexed env vars into the container. `openhands/app_server/sandbox/docker_sandbox_service.py:414-421 `

<a id="g2-f004"></a>
### Sandbox readiness is a two-stage check

`openhands/app_server/sandbox/sandbox_service.py:120-140` @ ae5b8a9

poll status until RUNNING, then hit the agent-server `/alive` endpoint before returning, closing the race where the container reports running but the agent server isn't listening yet. `openhands/app_server/sandbox/sandbox_service.py:120-140 `

## Skills, prompts, tools

<a id="g2-f005"></a>
### Skills are markdown files with YAML frontmatter ( name , type , version , agent , triggers )

`skills/add_agent.md:1-17` @ ae5b8a9

Skills are markdown files with YAML frontmatter (`name`, `type`, `version`, `agent`, `triggers`); triggers are keyword words for knowledge skills or slash-commands for task skills. `skills/add_agent.md:1-17 `, `skills/code-review.md:1-4 `

<a id="g2-f006"></a>
### Trigger type is inferred at load

`openhands/app_server/app_conversation/skill_loader.py:504-511` @ ae5b8a9

any trigger starting with `/` becomes a `TaskTrigger`, otherwise a `KeywordTrigger`. `openhands/app_server/app_conversation/skill_loader.py:504-511 `

<a id="g2-f007"></a>
### The app-server is a thin proxy for skill loading

`openhands/app_server/app_conversation/skill_loader.py:1-11` @ ae5b8a9

it builds org/sandbox config and POSTs to the agent-server `/api/skills` endpoint, which owns all source-specific loading; failures degrade to an empty skill list rather than raising. `openhands/app_server/app_conversation/skill_loader.py:1-11 `, `:447-492 `

<a id="g2-f008"></a>
### MCP tools are hosted server-side via FastMCP('mcp', mask_error_details=True) , exposing PR/MR-creation tools per provider ( create_pr , create_mr , create_bitbucket_pr , create_bitbucket_data_center_pr , create_azure_devops_pr )

`openhands/app_server/mcp/mcp_router.py:43-75` @ ae5b8a9

MCP tools are hosted server-side via `FastMCP('mcp', mask_error_details=True)`, exposing PR/MR-creation tools per provider (`create_pr`, `create_mr`, `create_bitbucket_pr`, `create_bitbucket_data_center_pr`, `create_azure_devops_pr`); Tavily search is mounted as a proxy so the API key never enters the sandbox. `openhands/app_server/mcp/mcp_router.py:43-75 `, `:147-424 `

<a id="g2-f009"></a>
### Skills are attached to the agent by merging into AgentContext.skills via immutable…

`openhands/app_server/app_conversation/app_conversation_service_base.py:166-211` @ ae5b8a9

Skills are attached to the agent by merging into `AgentContext.skills` via immutable `model_copy` updates, deduped by name with later sources overriding earlier ones. `openhands/app_server/app_conversation/app_conversation_service_base.py:166-211 `

## Patterns worth porting

<a id="g2-f010"></a>
### Global skill-repo discovery

`openhands/app_server/app_conversation/skill_loader.py:198-217` @ ae5b8a9

for each authenticated git provider, enumerate the user's login plus their orgs/groups and probe convention repos (`owner/.openhands` + `owner/.agents` on GitHub-style, `owner/openhands-config` on GitLab/Azure). Discovery is bounded (`_MAX_ORG_CANDIDATES=30`), URL resolution runs concurrently under a semaphore (`_URL_RESOLVE_CONCURRENCY=8`), and unresolved repos are dropped. `openhands/app_server/app_conversation/skill_loader.py:198-217 `, `:264-370 `

<a id="g2-f011"></a>
### Confirmation policy is derived from two orthogonal inputs (a boolean confirmation-mode…

`openhands/app_server/app_conversation/app_conversation_service_base.py:731-742` @ ae5b8a9

Confirmation policy is derived from two orthogonal inputs (a boolean confirmation-mode flag and the analyzer string) rather than a mode matrix: off then `NeverConfirm`, on+llm-analyzer then `ConfirmRisky`, on otherwise then `AlwaysConfirm`. `openhands/app_server/app_conversation/app_conversation_service_base.py:731-742 `

<a id="g2-f012"></a>
### Workspace teardown is split from sandbox teardown

`openhands/app_server/sandbox/sandbox_service.py:206-221` @ ae5b8a9

`archive_conversation_workspace` (default no-op, overridden by the remote backend) captures a conversation's workspace *while the runtime is still up*, and returns False to keep the sandbox alive for a later capture when a required archive fails. `openhands/app_server/sandbox/sandbox_service.py:206-221 `

<a id="g2-f013"></a>
### Idle-capacity management

`openhands/app_server/sandbox/sandbox_service.py:223-264` @ ae5b8a9

`pause_old_sandboxes` pages through running sandboxes, sorts oldest-first, and pauses the overflow so `start_sandbox` can always make room by calling `pause_old_sandboxes(max_num_sandboxes - 1)`. `openhands/app_server/sandbox/sandbox_service.py:223-264 `, `openhands/app_server/sandbox/docker_sandbox_service.py:398-399 `

## Open threads / weak spots

<a id="g2-f014"></a>
### The org_configs list is sent alongside a legacy singular org_config (first entry) to stay…

`openhands/app_server/app_conversation/skill_loader.py:428-439` @ ae5b8a9

The `org_configs` list is sent alongside a legacy singular `org_config` (first entry) to stay compatible with older agent-server images — a dual-payload shim that needs removal once all images understand the list form. `openhands/app_server/app_conversation/skill_loader.py:428-439 `

<a id="g2-f015"></a>
### The WEB_HOST default is hardcoded to app.all-hands.dev and PR-followup links only render in SAAS mode, so self-hosted deployments silently get no conversation backlink in generated PRs

`openhands/app_server/mcp/mcp_router.py:45-46` @ ae5b8a9

The `WEB_HOST` default is hardcoded to `app.all-hands.dev` and PR-followup links only render in SAAS mode, so self-hosted deployments silently get no conversation backlink in generated PRs. `openhands/app_server/mcp/mcp_router.py:45-46 `, `:82-95 `

<a id="g2-f016"></a>
### Host-network mode plus max_num_sandboxes > 1 is only a runtime warning, not a guard

`openhands/app_server/sandbox/docker_sandbox_service.py:390-396` @ ae5b8a9

Host-network mode plus `max_num_sandboxes > 1` is only a runtime warning, not a guard; concurrent sandboxes will collide on the same host ports. `openhands/app_server/sandbox/docker_sandbox_service.py:390-396 `

<a id="g2-f017"></a>
### Skill-loading failures are broadly swallowed and logged at debug/warning

`openhands/app_server/app_conversation/skill_loader.py:481-492` @ ae5b8a9

Skill-loading failures are broadly swallowed and logged at debug/warning; a misconfigured provider silently yields fewer skills with no user-facing signal. `openhands/app_server/app_conversation/skill_loader.py:481-492 `, `openhands/app_server/app_conversation/app_conversation_service_base.py:161-164 `

