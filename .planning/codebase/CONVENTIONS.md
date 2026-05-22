# Coding Conventions

**Analysis Date:** 2026-01-21

## Naming Patterns

**Files:**
- UPPERCASE.md for major project documents (README.md, PLAN.md, TEST.md, LICENSE)
- kebab-case.sh for shell scripts (build.sh, test.sh, run.sh)
- kebab-case.yaml for workflow files

**Functions:**
- Not applicable (no implementation code)

**Variables:**
- Environment variables: UPPER_SNAKE_CASE (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)

**Types:**
- Not applicable (no TypeScript/Go code)

## Code Style

**Formatting:**
- No Prettier, ESLint, or similar config detected
- Shell scripts use conventional bash formatting

**Linting:**
- Not configured

**Shell Scripts:**
- Comments explaining purpose
- Placeholder echo statements for unimplemented features

## Import Organization

**Not applicable** - No application code exists.

## Error Handling

**Shell Scripts:**
- Basic error checking in GitHub Actions workflow (file existence, non-empty checks)
- No error handling in placeholder scripts

## Logging

**Shell Scripts:**
- echo statements for progress indication
- Output redirects to result.txt for CLI output

## Comments

**Documentation Style:**
- Comprehensive markdown documentation (README.md, PLAN.md, TEST.md)
- Inline comments in shell scripts explaining purpose
- Sample result.txt with inline comments for output format

**TODO Comments:**
- Not detected in current files

## Function Design

**Not applicable** - No implementation code.

## Module Design

**Not applicable** - No implementation code.

## File Organization

**Documentation:**
- README.md - Assignment overview and submission notes
- PLAN.md - Detailed technical implementation plan
- TEST.md - Manual test checklist

**Scripts:**
- build.sh, test.sh, run.sh - Executable scripts with placeholder implementations
- result.txt - Sample output showing expected timestamp format

**CI/CD:**
- backend-verify-result.yaml - GitHub Actions workflow for backend verification

---

*Convention analysis: 2026-01-21*
*Note: No implementation code exists yet. Conventions will be established when development begins.*
*Update when patterns change*
