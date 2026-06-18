import { runDemo } from './cli.js'

// The entrypoint intentionally runs a fixed scenario and writes its trace to stdout.
// scripts/run.sh redirects that output into scripts/result.txt for CI validation.
await runDemo()
