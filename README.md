
Due to time constraints, I completed only the front end

For Nodejs backend, we can use object proxy to simulate non-blocking queue, which I think is better than while loop + promise approach

core logic is in `src/stores/queue.ts` under 100 lines, no pooling, no unnecessary delay, no queue library

`src/stores/__creator` is a utility function to create stores, safe to ignore

the rest are UI components

public url: https://symphonious-seahorse-30d6d3.netlify.app/

to install:

```bash
npm i
```

to run:

```bash
npm run dev
```

This repository is coded without AI assistance.

## Video Demo

[![video demo](https://img.youtube.com/vi/ORCfP3-Seeo/maxresdefault.jpg)](https://youtu.be/ORCfP3-Seeo)