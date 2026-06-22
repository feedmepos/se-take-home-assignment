---
name: google-go-style
description: Use when writing Go code to ensure compliance with Google's Go Style Guide. Provides rules for naming, formatting, error handling, commentary, imports, and idioms from the official Google Go style guide (https://google.github.io/styleguide/go/).
---

# Google Go Style Guide (Condensed)

Based on https://google.github.io/styleguide/go/guide and https://google.github.io/styleguide/go/decisions.

## Core Principles (in order of priority)

1. **Clarity** — Code purpose and rationale must be clear to the reader, not the author
2. **Simplicity** — Accomplish the goal in the simplest way possible; use the least mechanism
3. **Concision** — High signal-to-noise ratio; avoid repetitive code and names
4. **Maintainability** — Easy for future programmers to modify correctly
5. **Consistency** — Look and feel like similar code in the broader codebase

## Naming Rules

| Rule | Correct | Incorrect |
|------|---------|-----------|
| MixedCaps, no underscores | `MaxLength`, `maxLength`, `userCount` | `MAX_LENGTH`, `max_length`, `user_count` |
| Initialisms same case | `URL`, `ID`, `urlPony`, `xmlAPI` | `Url`, `Id`, `XmlApi` |
| No `Get` prefix on getters | `user.Count()` | `user.GetCount()` |
| No `Get`/`get` prefix on methods | `Counts()` not `GetCounts()` | `GetCounts()` |
| Package import name | `import urlpkg "net/url"` (only when necessary) | `import . "net/url"` |
| No `import .` (dot imports) | `foo.Bar()` | `. "foo"` then `Bar()` |

### Receiver Names

Short (1-2 letters), abbreviation of the type, consistent across all methods:

```go
// Good:
func (s *Scanner) Scan() {}
func (s *Scanner) Close() {}

// Bad:
func (self *Scanner) Scan() {}
func (this *Scanner) Close() {}
```

### Variable Names by Scope

- Small (1-7 lines): single letter or short word (`c`, `count`)
- Medium (8-15 lines): descriptive word (`userCount`)
- Large (15-25+ lines): self-documenting (`projectUserCount`)
- Omit type words: `users` not `userSlice`; `count` not `numUsers`

## Error Handling

- Return `error` as the last result parameter
- Return `nil` error for success; non-nil error for failure
- Error strings: lowercase, no trailing punctuation
- Handle errors immediately (check then return) — indent error flow, not normal flow
- Do NOT discard errors with `_` unless documented to never fail
- Prefer `error` interface over concrete error types (avoid nil interface bugs)
- Use `fmt.Errorf` with `%w` for error wrapping

```go
// Good:
if err != nil {
    return fmt.Errorf("load user: %w", err)
}
// normal code continues without indentation

// Bad:
if err != nil {
    return err
} else {
    // normal code indented unnecessarily
}
```

## Formatting

- All `.go` files must pass `gofmt` (non-negotiable)
- No fixed line length limit; prefer refactoring over splitting long lines
- Struct literals from other packages MUST use field names
- Closing brace on its own line for multi-line literals
- No cuddling braces unless inner values are also literals

```go
// Good:
r := csv.Reader{
    Comma:  ',',
    FieldsPerRecord: 4,
}

// Bad:
r := csv.Reader{',', 4}
```

## Imports

- Groups in order: (1) stdlib, (2) project/vendored, (3) proto, (4) side-effect
- No dot imports (except in tests as last resort)
- Rename only for collision or uninformative names (`core "k8s.io/api/core/v1"`)
- Blank imports only in `main` package or tests

## Commentary

- All exported names need doc comments (full sentence, starts with name)
- Package comment above package clause, one per package
- Use `doc.go` for long package comments
- Error strings lowercase; log/test messages capitalized
- Comments explain *why*, not *what* (let code speak for itself)

## Idioms

- Use `len(s) == 0` to check emptiness (works for nil slices too)
- Prefer `var s []T` (nil) over `s := []T{}` (empty) for local declarations
- Named result params OK for same-type returns or deferred closures; avoid naked returns in medium+ functions
- Use `switch` over long `if-else if` chains
- Table-driven tests (input → want) rather than repetitive test functions

## Testing

- External test packages (`package xxx_test`) preferred
- Descriptive naming: `TestXxx_Yyy`
- Fail immediately with `t.Fatalf` (not `t.Error`)
- Table-driven tests: `t.Run(tc.name, ...)`
- Test helpers: `t.Helper()`, named `mustXxx` or `runXxx`

```go
func TestParse_UsesCorrectDelimiter(t *testing.T) {
    tests := []struct {
        name  string
        input string
        want  string
    }{
        {name: "comma", input: "a,b", want: "a"},
        {name: "space", input: "a b", want: "a"},
    }
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            got := Parse(tc.input)
            if got != tc.want {
                t.Fatalf("Parse(%q) = %q, want %q", tc.input, got, tc.want)
            }
        })
    }
}
```

## Red Flags (violations to catch in review)

- [ ] Underscores in Go names (`max_length`, `MAX_VALUE`)
- [ ] `Get` prefix on accessor methods
- [ ] `import .` or blank imports in library code
- [ ] Error string capitalized or ending with punctuation
- [ ] `else` after error return (normal code indented)
- [ ] Struct literal without field names for external types
- [ ] `t.Error` instead of `t.Fatalf` in tests
- [ ] Named returns used just to avoid declaring variables
- [ ] Repetitive names (`db.LoadFromDatabase` → `db.Load`)
- [ ] Dot imports in production code
