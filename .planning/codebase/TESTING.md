# Testing Patterns

**Analysis Date:** 2026-01-21

## Test Framework

**Runner:**
- Not detected (no test framework configured)

**Assertion Library:**
- Not detected

**Run Commands:**
```bash
./scripts/test.sh              # Run all tests (placeholder)
```

## Test File Organization

**Location:**
- No test files exist (implementation not started)

**Naming:**
- Not applicable

**Structure:**
```
(Not yet implemented)
```

## Test Structure

**Suite Organization:**
- Not applicable (no tests)

## Mocking

**Framework:**
- Not detected

**Patterns:**
- Not applicable

**What to Mock:**
- Not applicable

**What NOT to Mock:**
- Not applicable

## Fixtures and Factories

**Test Data:**
- `scripts/result.txt` contains sample output format showing expected CLI behavior
- Sample includes timestamps in HH:MM:SS format
- Demonstrates order queue behavior (VIP before Normal)

**Location:**
- scripts/result.txt

## Coverage

**Requirements:**
- No coverage requirements specified

**Configuration:**
- Not configured

**View Coverage:**
- Not applicable

## Test Types

**Unit Tests:**
- Not implemented (placeholder in scripts/test.sh)

**Integration Tests:**
- Not implemented

**E2E Tests:**
- Manual test checklist in TEST.md

**Manual Testing:**
- TEST.md contains checklist for manual verification:
  - Create normal order shows in PENDING
  - Create VIP order queues before all normal orders but behind existing VIP
  - Order numbers are unique and increasing
  - + Bot starts processing pending order and completes after ~10 seconds
  - Bot continues to next order when available
  - Bot becomes IDLE when no pending orders
  - - Bot removes newest bot and returns in-flight order to PENDING
  - Processing resumes with remaining bots
  - UI reflects PENDING / PROCESSING / COMPLETE accurately

## Common Patterns

**CI/CD Testing:**
- GitHub Actions workflow (`.github/workflows/backend-verify-result.yaml`) verifies:
  - Go 1.23.9 and Node.js 22.19.0 availability
  - scripts/test.sh execution
  - scripts/build.sh execution
  - scripts/run.sh execution
  - result.txt existence and non-empty verification
  - Timestamp format validation (HH:MM:SS regex pattern)

**Manual Test Checklist:**
- Located in TEST.md
- All items currently unchecked (not run)
- Status: "Not run"

---

*Testing analysis: 2026-01-21*
*Update when test patterns change*
