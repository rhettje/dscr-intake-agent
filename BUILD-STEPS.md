# Build Steps

Follow these in order. Each milestone ends with a check and a Git commit.
Paste each **Prompt** into Claude Code exactly as written. Read what it plans before approving changes.

---

## Milestone 0: Setup (once)

**Install first**
1. Node.js LTS from nodejs.org. Check in a new PowerShell window: `node --version` and `npm --version`
2. A GitHub account, and Git configured:
   ```powershell
   git config --global user.name "Rhett John Esteban"
   git config --global user.email "your-github-email@example.com"
   ```
3. An Anthropic API key from console.anthropic.com (add a few dollars of credit)

**Create the project**
```powershell
mkdir C:\Projects\dscr-intake-agent
cd C:\Projects\dscr-intake-agent
git init
```
Copy `SPEC.md`, `CLAUDE.md` and `BUILD-STEPS.md` into this folder. Then start Claude Code **from this folder**:
```powershell
claude
```
If it says "Not logged in", type `/login` first.

---

## Milestone 1: Project skeleton

**Prompt**
> Read SPEC.md and CLAUDE.md. Set up the TypeScript project skeleton for Milestone 1 only: package.json with scripts (dev, test, typecheck), tsconfig with strict mode, Vitest, a .gitignore (node_modules, .env, data/), a .env.example with ANTHROPIC_API_KEY, ANTHROPIC_MODEL and WEBHOOK_URL left empty, the folder structure from the spec, and config/guidelines.json with the example values. No agent code yet. Explain each file.

**Check:** `npm install`, then `npm run typecheck` runs without errors.

**Then:** copy `.env.example` to `.env` and fill in your API key and a current model ID (Claude Code can look up the current ID from Anthropic's docs).

**Commit**
```powershell
git add .
git commit -m "chore: project skeleton with TypeScript, Vitest and config"
```

---

## Milestone 2: Calculators and eligibility (no AI yet)

**Prompt**
> Build Milestone 2: the calculate_dscr, calculate_ltv and check_eligibility functions from SPEC.md sections 5.1–5.3 and section 7, as pure TypeScript functions with input validation. Write Vitest tests including: a case where rent is $2,500 and total monthly PITIA is $2,000 (DSCR 1.25), the SPEC.md example deal ($300,000 loan at 7% over 30 years, $2,500 rent, $350 taxes, $120 insurance, which should come out near the 1.00 minimum and be flagged needs_review), an interest-only loan, zero or negative inputs, an excluded state, a DSCR just above the minimum (needs_review), and a best-tier deal. Run the tests and fix failures.

**Check:** `npm test` shows all tests passing. Ask Claude Code: *"Walk me through how DSCR is calculated in this code."* Make sure you can explain it yourself.

**Commit:** `git commit -am "feat: DSCR, LTV and eligibility calculators with tests"` (use `git add .` first if new files were created)

---

## Milestone 3: The Intake Agent with tool use

**Prompt**
> Build Milestone 3: the Intake Agent from SPEC.md section 6.1 using the Anthropic TypeScript SDK and tool use. Register calculate_dscr, calculate_ltv, check_eligibility and save_lead as tools (save_lead can store to memory for now). Implement the agent loop: send messages, run any tool calls, return tool results, repeat until the model gives a final answer. Add a simple command-line chat (npm run chat) so I can test it in PowerShell. Explain how the agent loop works.

**Check:** `npm run chat`. Pretend to be an investor. Confirm the agent asks for missing details one or two at a time, calls the calculators, and never invents numbers.

**Commit:** `feat: intake agent with Anthropic tool use and CLI chat`

---

## Milestone 4: Database, webhook and escalation

**Prompt**
> Build Milestone 4: replace the in-memory store with SQLite as described in SPEC.md section 9. Make save_lead also POST the lead JSON to WEBHOOK_URL when it is set, with errors logged but never crashing. Add the escalate_to_underwriter tool and the escalation rules from section 6.1 rule 5. Add tests for the database functions.

**Check:** run a chat that qualifies. Confirm a row appears in `data/leads.db`. For the webhook, get a free test URL from a request-inspection site, put it in `.env` as WEBHOOK_URL, and confirm the lead arrives.

**Commit:** `feat: SQLite storage, CRM webhook and escalation tool`

---

## Milestone 5: Underwriting Review Agent (multi-agent)

**Prompt**
> Build Milestone 5: the Underwriting Review Agent from SPEC.md section 6.2. When escalate_to_underwriter runs, call this second agent with the lead data and store its structured summary on the lead. Keep the two agents' prompts in separate files. Explain how the two agents hand off work.

**Check:** escalate a deal, then read the summary. Is it accurate? Does it list missing documents and a next step?

**Commit:** `feat: underwriting review agent for multi-agent handoff`

---

## Milestone 6: Web chat page and API

**Prompt**
> Build Milestone 6: the Express API from SPEC.md section 8 and a single static chat page (plain HTML, CSS and JavaScript, no framework) at /. Show the conversation, a typing indicator, and a small side panel listing tool calls as they happen so a viewer can see the agent working. Add a simple /leads page listing saved leads and their underwriting summaries.

**Check:** `npm run dev`, open the local address it prints in your browser, and run a full conversation from first message to escalation.

**Commit:** `feat: web chat UI, leads view and REST API`

---

## Milestone 7: Documentation and publish

**Prompt**
> Build Milestone 7: write a README.md with: what the project does, a Mermaid architecture diagram, setup steps for Windows, how the agent decides to answer/ask/act/escalate, the multi-agent handoff, how to run tests, and a "Design decisions" section. Add a note that lending rules are example values. Check that no secrets are committed.

**Publish to GitHub**
1. On github.com, create a new **empty** repository named `dscr-intake-agent` (no README, no .gitignore).
2. In PowerShell:
   ```powershell
   git add .
   git commit -m "docs: README with architecture and design decisions"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/dscr-intake-agent.git
   git push -u origin main
   ```
3. Record a 2-minute screen demo of a full conversation and the leads page.

---

## If something goes wrong
Copy the full error message and paste it to Claude Code with: *"I got this error. Explain what caused it, then fix it."* If you're stuck, bring the error back to our chat.

## Interview prep as you go
After each milestone, ask Claude Code: *"What questions might an interviewer ask about what we just built, and how should I answer?"*
