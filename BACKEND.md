# McDonald's Order Controller — Backend (Node.js CLI)

## Run locally

```bash
npm install
npm test
npm start              # demo simulation (~30s), prints to stdout
npm run interactive    # interactive CLI for interview
```

## Interactive commands

| Command | Action |
|---------|--------|
| `normal` | Create normal order |
| `vip` | Create VIP order |
| `+bot` | Add cooking bot |
| `-bot` | Remove newest bot |
| `status` | Show queue and bots |
| `help` | Show commands |
| `quit` | Exit |

## CI scripts

- `scripts/test.sh` — runs `npm test`
- `scripts/build.sh` — runs `npm install`
- `scripts/run.sh` — runs demo, writes `scripts/result.txt`
