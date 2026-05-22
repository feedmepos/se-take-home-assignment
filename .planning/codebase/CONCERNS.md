# Codebase Concerns

**Analysis Date:** 2026-01-21

## Tech Debt

**No implementation code exists:**
- Issue: Project is in planning phase only
- Files: Entire repository - no application code present
- Why: This is a take-home assignment that hasn't been implemented yet
- Impact: No functional prototype exists
- Fix approach: Begin implementation following PLAN.md or create backend CLI

**Placeholder scripts:**
- Issue: scripts/build.sh, scripts/test.sh, scripts/run.sh contain only placeholder comments
- Files: `scripts/build.sh`, `scripts/test.sh`, `scripts/run.sh`
- Why: Skeleton scripts prepared but not implemented
- Impact: GitHub Actions workflow will pass but does nothing meaningful
- Fix approach: Implement actual build, test, and run logic for chosen track

## Known Bugs

**Not applicable** - No implementation code to have bugs.

## Security Considerations

**Exposed Turso credentials in .env:**
- Risk: Database credentials (JWT token and connection URL) are stored in plaintext `.env` file
- File: `.env` (line 1-2)
- Current mitigation: File is gitignored (`.gitignore` contains `.env`)
- Recommendations: Credentials are already gitignored, but ensure they are rotated if this repository was ever public. When implementing, use environment variable injection in CI/CD (GitHub Actions secrets) rather than committing `.env`.

**No .env.example:**
- Risk: Developers don't know what environment variables are required
- File: Missing `.env.example`
- Current mitigation: Documented in PLAN.md and INTEGRATIONS.md
- Recommendations: Create `.env.example` with placeholder values showing required variables (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)

## Performance Bottlenecks

**Not applicable** - No implementation code.

## Fragile Areas

**Not applicable** - No implementation code.

## Scaling Limits

**Not applicable** - No implementation code.

## Dependencies at Risk

**No dependencies:**
- Risk: No package.json, go.mod, or similar dependency files
- Impact: Cannot verify dependency versions or vulnerabilities
- Status: Expected - project is pre-implementation

## Missing Critical Features

**No functional prototype:**
- Problem: Assignment requires working prototype but none exists
- Current workaround: None
- Blocks: All submission requirements (public URL, testing, verification)
- Implementation complexity: High - full implementation needed

**Submission notes incomplete:**
- Problem: README.md has "TODO" placeholders for submission requirements
- File: `README.md` (lines 67-70)
- Current workaround: Manual updates during submission
- Blocks: Proper submission documentation
- Implementation complexity: Low - update with actual values

**Manual tests not run:**
- Problem: TEST.md shows all tests as unchecked with "Status: Not run"
- File: `TEST.md` (lines 1-17)
- Current workaround: None
- Blocks: Verification that requirements are met
- Implementation complexity: Medium - requires implementation first

## Test Coverage Gaps

**No tests:**
- What's not tested: Everything (no implementation)
- Risk: Cannot verify any functionality
- Priority: N/A (implementation must come first)
- Difficulty to test: N/A

**Manual test checklist incomplete:**
- What's not tested: All manual test items in TEST.md
- Risk: Cannot verify requirements are met
- Priority: High (required for submission)
- Difficulty to test: Medium (requires implementation + manual verification)

## Planning-Related Notes

**Ambiguous implementation track:**
- Concern: PLAN.md describes a complex frontend implementation (TanStack Start, Drizzle, Turso, PWA, offline sync) but the assignment allows either frontend OR backend
- Files: `PLAN.md` (entire document), `README.md` (requirements)
- Risk: Significant over-engineering for a 30-minute "vibe coding" task as suggested in README tips
- Recommendation: Consider simplifying to backend CLI track (Go/Node.js) for faster completion, or reduce frontend scope

**Scope concerns:**
- The PLAN.md outlines a full-stack PWA with offline sync, UUID7, soft deletes, role-based auth - far exceeding the "30 minute" suggestion in README tips
- Assignment tips suggest: "Treat this assignment as a vibe coding, don't over engineer it. Try to scope your working hour within 30 min."
- Consider implementing backend track (CLI application) which may be more aligned with time constraints

---

*Concerns audit: 2026-01-21*
*Note: Most concerns stem from the fact that this is a pre-implementation planning phase. Actual implementation concerns will be discovered during development.*
*Update as issues are fixed or new ones discovered*
