# DSCR Loan Intake Agent: Specification

A demo AI agent for private real estate lenders. It chats with a real estate investor about a rental property loan, collects the deal details, calculates DSCR and LTV, checks the deal against the lender's guidelines, and decides whether to answer, ask for more information, take an action, or escalate to a human underwriter. A second agent writes an underwriting summary for the human.

> Demo only. Lending rules are example values in a config file, not real lending advice. Not affiliated with any lender.

---

## 1. Goals

1. Show a working **agentic workflow**: reasoning, multi-step tasks, tool use, and escalation to a human.
2. Show **multi-agent collaboration**: an Intake Agent hands a completed file to an Underwriting Review Agent.
3. Show production habits: TypeScript, tests, clean Git history, documentation, secrets kept out of the repo.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript on Node.js (LTS) |
| AI | Anthropic Messages API via the official TypeScript SDK (`@anthropic-ai/sdk`), using **tool use** |
| Model | Set in `.env` as `ANTHROPIC_MODEL`. Use a current Claude model ID from Anthropic's docs; never hard-code it |
| Web server | Express (or Hono) serving a JSON API and one static chat page |
| Database | SQLite (`better-sqlite3`), file `data/leads.db` |
| Tests | Vitest |
| Config | `.env` for secrets, `config/guidelines.json` for lending rules |

## 3. Users and flow

**Investor (customer-facing):** chats on a web page.

**Underwriter (internal):** receives an escalation with a summary written by the Review Agent.

```
Investor ──chat──► Intake Agent ──tools──► calculators, guidelines, database
                        │
                        ├── answers questions / asks for missing details
                        ├── saves the lead (database + webhook)
                        └── escalates ──► Underwriting Review Agent ──► summary for human underwriter
```

## 4. Information the Intake Agent collects

| Field | Type | Example |
|---|---|---|
| Borrower name | string | Maria Santos |
| Email / phone | string | maria@example.com |
| Borrowing entity (LLC) | string, optional | Santos Holdings LLC |
| Loan purpose | enum: `purchase`, `refinance`, `cash_out_refinance` | purchase |
| Program | enum: `dscr_rental`, `bridge`, `fix_and_flip` | dscr_rental |
| Property state | 2-letter code | TX |
| Property type | enum: `sfr`, `2_4_unit`, `condo`, `townhome`, `5_plus_multifamily` | sfr |
| Purchase price or value (USD) | number | 400000 |
| Loan amount requested (USD) | number | 300000 |
| Monthly rent (USD) | number | 2500 |
| Monthly property taxes (USD) | number | 350 |
| Monthly insurance (USD) | number | 120 |
| Monthly HOA (USD) | number, default 0 | 0 |
| Estimated credit score | number | 720 |
| Investor experience (properties owned) | number | 3 |

The agent asks for missing fields **one or two at a time**, conversationally, never as a long form.

## 5. Tools (functions the agent can call)

Each tool is a plain TypeScript function with a typed input, a unit test, and a JSON schema registered with the Anthropic API.

### 5.1 `calculate_dscr`
- **Input:** `loanAmount`, `annualRatePercent`, `termYears` (default 30), `interestOnly` (default false), `monthlyRent`, `monthlyTaxes`, `monthlyInsurance`, `monthlyHoa`
- **Logic:**
  - Monthly principal and interest (P&I) uses the standard amortization formula. If `interestOnly`, P&I = loan × rate ÷ 12.
  - PITIA = P&I + taxes + insurance + HOA
  - DSCR = monthly rent ÷ PITIA, rounded to 2 decimals
- **Output:** `{ monthlyPI, pitia, dscr }`

### 5.2 `calculate_ltv`
- **Input:** `loanAmount`, `propertyValue`
- **Output:** `{ ltvPercent }` rounded to 1 decimal

### 5.3 `check_eligibility`
- **Input:** the collected deal fields, plus DSCR and LTV results
- **Logic:** compares against `config/guidelines.json` (see section 7). Returns every rule checked.
- **Output:** `{ eligible: boolean, tier: "best" | "standard" | "decline" | "needs_review", reasons: string[] }`

### 5.4 `save_lead`
- **Input:** all collected fields + calculation results + a short conversation summary
- **Action:** insert or update a row in SQLite; then POST the lead as JSON to `WEBHOOK_URL` if set (this simulates sending the lead to a CRM). Webhook failures are logged and never crash the chat.
- **Output:** `{ leadId }`

### 5.5 `escalate_to_underwriter`
- **Input:** `leadId`, `reason`
- **Action:** marks the lead `escalated`, then runs the **Underwriting Review Agent** (section 6.2) and stores its summary.
- **Output:** `{ status: "escalated", summaryId }`

## 6. Agents

### 6.1 Intake Agent (customer-facing)
System prompt rules, in priority order:

1. Be friendly, brief and professional. Never promise approval, rates or terms. Say quotes come from a human after review.
2. **Answer** general questions about the loan programs using only `config/guidelines.json` and `config/faq.md`. If the answer isn't there, say so and offer a human.
3. **Ask** for missing required fields before calculating anything.
4. **Act**: once required fields are present, call `calculate_dscr`, `calculate_ltv`, then `check_eligibility`, then `save_lead`.
5. **Escalate** to a human underwriter when any of these is true:
   - eligibility tier is `best` or `standard` (a real opportunity: hand it to a person quickly)
   - tier is `needs_review` (borderline: a human decides)
   - the investor asks for a human, asks for a rate lock or firm quote, or is upset
   - the question involves legal, tax or anything outside lending guidelines
6. On `decline`, explain the main reason politely and still save the lead.
7. Never invent numbers. Every number in a reply must come from a tool result or from what the investor said.

### 6.2 Underwriting Review Agent (internal)
- Input: the saved lead, calculation results, eligibility reasons, conversation summary.
- Output: a structured summary for the human underwriter:
  - deal snapshot (program, property, amounts)
  - DSCR, LTV and eligibility tier
  - strengths and risks (3 bullets each, max)
  - missing documents to request (for example: leases, rent roll, entity documents)
  - suggested next step
- It does **not** talk to the investor and does **not** make the lending decision.

## 7. Example guidelines (`config/guidelines.json`)

Example values only, editable:

```json
{
  "dscr_rental": {
    "minLoan": 200000,
    "maxLoan": 10000000,
    "minCreditScore": 660,
    "maxLtvPercent": 80,
    "minDscr": 1.0,
    "bestTierDscr": 1.25,
    "bestTierCreditScore": 740,
    "exampleRatePercent": 7.0
  },
  "excludedStates": ["AK", "HI", "MN", "ND", "OR", "SD", "UT", "VT"],
  "businessPurposeOnly": true
}
```

Tier rules:
- `decline`: credit below minimum, excluded state, loan outside min/max, LTV above max, or DSCR below minimum
- `best`: DSCR ≥ bestTierDscr AND credit ≥ bestTierCreditScore AND all checks pass
- `standard`: all checks pass
- `needs_review`: any required value is estimated or uncertain, or DSCR is within 0.05 of the minimum

## 8. API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | Body `{ sessionId, message }` → agent reply + any tool events |
| GET | `/api/leads` | List saved leads (internal demo view) |
| GET | `/api/leads/:id` | One lead with its underwriting summary |
| GET | `/` | Static chat page |

## 9. Database (SQLite)

Table `leads`: `id`, `created_at`, `updated_at`, `status` (`new`, `saved`, `escalated`, `declined`), `data_json` (collected fields), `results_json` (DSCR, LTV, eligibility), `conversation_summary`, `underwriting_summary`.

Table `messages`: `id`, `session_id`, `role`, `content`, `created_at`.

## 10. Security and safety

- `ANTHROPIC_API_KEY` and `WEBHOOK_URL` live in `.env`, which is in `.gitignore`. Commit a `.env.example` with empty values.
- Validate all tool inputs; reject negative or missing numbers.
- Don't log full personal details to the console.
- The agent cannot approve loans or quote binding terms.

## 11. Definition of done

- [ ] All tool functions have passing unit tests (`npm test`)
- [ ] A full conversation from first message to escalation works in the browser
- [ ] A lead appears in `/api/leads` with an underwriting summary
- [ ] The webhook receives the lead JSON (test with a free request-inspection site)
- [ ] README explains setup, architecture, and design decisions, with a diagram
- [ ] Clean Git history: one commit per milestone, clear messages
- [ ] A 2-minute screen-recorded demo
