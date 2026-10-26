# Project instructions for Claude Code

This is the DSCR Loan Intake Agent. The full specification is in `SPEC.md`. Read it before starting any task.

## How we work
- Work on ONE milestone at a time, as described in `BUILD-STEPS.md`. Don't start the next milestone until asked.
- Before writing code, briefly explain the plan in plain English. The developer is learning and must be able to explain every part of this project in an interview.
- After writing code, explain what each new file does in 2–3 sentences.
- Prefer small, readable functions over clever code. Add short comments where the "why" isn't obvious.

## Tech rules
- TypeScript, strict mode. Node.js LTS. ES modules.
- Use the official Anthropic TypeScript SDK (`@anthropic-ai/sdk`) and its tool use feature.
- Read the model ID from `process.env.ANTHROPIC_MODEL`. Never hard-code a model name.
- Never hard-code secrets. Read them from `.env`. Never print the API key.
- Lending rules come from `config/guidelines.json`, never hard-coded in logic.
- Tests use Vitest. Every pure function (calculators, eligibility) gets unit tests, including edge cases.

## Commands
- Install: `npm install`
- Run tests: `npm test`
- Type check: `npm run typecheck`
- Start dev server: `npm run dev`

## Before saying a milestone is done
1. Run `npm run typecheck` and `npm test`, and fix any failures.
2. Show the developer how to check the result manually.
3. Suggest a commit message in the form `feat: ...`, `test: ...`, `docs: ...` or `fix: ...`.

## Environment
- The developer is on Windows using PowerShell. Give PowerShell commands, not bash.
- Keep `.env`, `data/` and `node_modules/` in `.gitignore`.
