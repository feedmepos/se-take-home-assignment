# foundation-cli Engineering Conventions

## Project Architecture

```
cmd/foundation-cli/main.go          # Entry point: build deps, Execute(), os.Exit(ExitCodeOf(err))
cmd/root.go                          # Root command builder: NewRootCommand(), NewDefaultExecutor()

internal/
  business/
    meta/                            # Command framework
      command.go                     #   CommandMeta, Executor interface, ExecutorFunc
      runtime.go                     #   Runtime (flag store), FlagBinder interface
      register.go                    #   Register(), execution pipeline (Normalize→LoadBody→Validate→BuildRequest→Execute)
    inputs/                          # Input helpers
      remote_options.go              #   RemoteOptions (tenant/endpoint/ak/sk/version), Normalize/Validate
      body.go                        #   LoadBody (inline or file, JSON validation)
    version/info.go                  #   Info struct
    <domain>/commands.go             #   Each: func Commands() []meta.CommandMeta
  errors/errors.go                   # Custom Error type, exit codes, HTTP status classifier
  external/console/
    request.go                       # RequestSpec {Method, Path, Headers, Body, ReadOnly}
    executor.go                      # Executor: signs + sends via transport.Client
  platform/
    output/
      streams.go                     # Streams {Stdout, Stderr}
      writer.go                      # WriteRaw, WriteJSON, WriteError
    signer/signer.go                 # AK/SK HMAC request signing
    transport/client.go              # HTTP Doer, read-only retry

tests/
  unit/                              # Mirrors source tree structure
  integration/cli_contract_test.go   # End-to-end CLI tests with httptest.Server
```

## Command Definition Pattern

Each domain package exports a single function:

```go
package <domain>

func Commands() []meta.CommandMeta {
    return []meta.CommandMeta{
        {
            Domain:        "<domain>",
            CanonicalPath: []string{"<parent>", "<subcommand>"},
            Use:           "<subcommand>",
            Description:   "<Short description>",
            Risk:          meta.RiskReadOnly,  // or meta.RiskWrite
            AuthType:      meta.AuthAKSK,
            ReadOnly:      true,               // false for write commands
            BindFlags: func(cmd *cobra.Command, rt *meta.Runtime) {
                rt.BindStringFlag(cmd.Flags(), "my-flag", "", "description")
            },
            Validate: func(rt *meta.Runtime) error {
                if rt.String("my-flag") == "" {
                    return clierrors.New(clierrors.CodeInvalidArgument, clierrors.ExitInvalidArgs, "missing --my-flag")
                }
                return nil
            },
            BuildRequest: func(rt *meta.Runtime) (console.RequestSpec, error) {
                return console.RequestSpec{
                    Method:   http.MethodGet,
                    Path:     "/api/v1/...",
                    Body:     rt.Body,
                    ReadOnly: true,
                }, nil
            },
        },
    }
}
```

**Rules:**
- Read-only commands: set `ReadOnly: true`, no body validation, `rt.Body` is nil
- Write commands: set `ReadOnly: false`, body required via `-d`/`--body-file`, `len(rt.Body) == 0` check in Validate
- Commands without flags/validation: omit `BindFlags` and/or `Validate` (nil-safe in pipeline)
- `CanonicalPath` determines CLI subcommand tree; use `[]string{"parent", "child"}` for `parent child` subcommands
- `Use` is the leaf subcommand name only

## Adding a New Domain

1. Create `internal/business/<domain>/commands.go` with `func Commands() []meta.CommandMeta`
2. Register in `cmd/root.go`: add `defs = append(defs, <domain>.Commands()...)`
3. Add domain import to `cmd/root.go`
4. Add tests in `tests/unit/business/domains/` (one file per read/write group)

## Runtime Flag Helpers

| Method | Flag Type | Getter |
|--------|-----------|--------|
| `BindStringFlag(cmd, name, default, usage)` | `--name` | `rt.String(name)` |
| `BindIntFlag(cmd, name, default, usage)` | `--name` | `rt.Int(name)` |
| `BindBoolFlag(cmd, name, default, usage)` | `--name` | `rt.Bool(name)` |
| `BindStringSliceFlag(cmd, name, default, usage)` | `--name` | `rt.Strings(name)` |

Body input flags (set directly on cobra.Command.Flags(), NOT via Runtime):
- `-d`/`--data`: inline JSON body → `rt.Inline`
- `--body-file`: JSON file path → `rt.BodyFile`

After pipeline execution, `rt.Body` contains the parsed JSON bytes.

## Execution Pipeline

1. `rt.Remote.Normalize()` — default target-version, validate remote options
2. `loadBodyIfNeeded(rt)` — load inline or file body into `rt.Body`
3. `def.Validate(rt)` — domain-specific validation
4. `def.BuildRequest(rt)` → `console.RequestSpec`
5. `deps.Console.Execute(ctx, rt, req)` → raw response bytes
6. `output.WriteRaw(deps.Streams, body)` — write response to stdout

## Error Handling

### Error struct
```go
type Error struct {
    Code     string   // e.g. "Cli.InvalidArgument"
    ExitCode int      // e.g. 101
    Message  string
    Cause    error
}
```

### Exit codes
| Code | Meaning |
|------|---------|
| 0    | Success |
| 101  | Invalid arguments |
| 201  | Auth error |
| 301  | Transport error |
| 409  | Conflict |
| 551  | Compatibility |

### Factory functions
- `clierrors.New(code, exitCode, message)` — standalone error
- `clierrors.Wrap(code, exitCode, message, cause)` — wrap underlying error
- `clierrors.ClassifyHTTPStatus(status)` — map HTTP status to CLI error

### Error codes
`"Cli.XxxYyy"` — PascalCase after `Cli.` prefix, e.g. `Cli.InvalidArgument`, `Cli.Unauthorized`, `Cli.Conflict`

### Usage in Validate/BuildRequest
```go
return clierrors.New(clierrors.CodeInvalidArgument, clierrors.ExitInvalidArgs, "missing --object-id")
```

## Testing Conventions

### Test packages
- External test packages: `package xxx_test` (preferred)
- Integration tests: `package integration_test`

### Test file placement
```
tests/unit/business/<domain>/...   → mirrors internal/business/
tests/unit/platform/...             → mirrors internal/platform/
tests/unit/external/console/...     → mirrors internal/external/
tests/unit/cmd/...                  → mirrors cmd/
tests/integration/...               → end-to-end tests
```

### Test patterns
- **Function naming**: `TestXxx_Yyy` descriptive (e.g., `TestLoadBody_RejectsMissingAndInvalidJSON`)
- **Assertions**: `t.Fatalf` (fail immediately, NOT `t.Error`)
- **Streams**: Use `bytes.Buffer` for `output.Streams`, always verify both `stdout` and `stderr`
- **Temp files**: `t.TempDir()` for body file tests
- **Table-driven tests**: Used in integration tests with `t.Run(tc.name, ...)`
- **Test helpers**: `t.Helper()`, named `mustXxx` or `runXxx`

### Integration test pattern
```go
func TestCLIContract(t *testing.T) {
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // route by method+path
    }))
    defer srv.Close()
    
    cases := []struct {
        name               string
        args               []string
        wantExit           int
        wantStdout         string
        wantStderrContains string
    }{ ... }
    
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            stdout, stderr, exitCode := runCLI(t, srv, tc.args)
            // assert exitCode, stdout, stderr
        })
    }
}
```

## Input Validation

### RemoteOptions (always applied to all remote commands)
- `--tenant-id` (required)
- `--endpoint` (required, must be valid URL with scheme+host)
- `--ak` (required)
- `--sk` (required)
- `--target-version` (optional, defaults to "8.0.9.0", only this version accepted)

### Body validation
```go
inputs.LoadBody(inline, bodyFile)
```
- Inline and body-file are mutually exclusive
- At least one is required for write commands
- Both paths validate JSON syntax

## Output Conventions

- **stdout**: Only response data (raw bytes or JSON)
- **stderr**: Only error messages (via `output.WriteError`)
- **JSON output**: `output.WriteJSON(streams, v)` — HTML-escaped characters disabled
- **Raw output**: `output.WriteRaw(streams, body)` — passthrough bytes

## Dependency Injection

At startup in `main.go`:
```go
streams := output.DefaultStreams()
root := cmd.NewRootCommand(cmd.Dependencies{
    Streams: streams,
    Version: cmd.BuildVersionInfo(cliVersion),
    Console: cmd.NewDefaultExecutor(&http.Client{Timeout: 30 * time.Second}),
})
err := root.Execute()
// error → stderr + ExitCodeOf(err)
```

`NewDefaultExecutor` wraps `console.Executor` (Signer + Transport) as `meta.ExecutorFunc`.

## Import Ordering Convention

Within each file, imports are grouped in order:
1. Standard library
2. Internal packages (`foundation-cli/internal/...`, `foundation-cli/cmd`)
3. Third-party (`github.com/...`)

No blank line between groups unless gofmt inserts one.

## Naming Conventions

- **Files**: lowercase with hyphens (`remote_options.go`)
- **Functions**: PascalCase exported
- **Unexported functions**: camelCase
- **Constants**: PascalCase for error codes, risk levels, exit codes
- **Types**: PascalCase (`CommandMeta`, `RemoteOptions`, `Runtime`)
- **Variables**: camelCase
