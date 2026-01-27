
Due to time constraints, I completed only the front end

~~For Nodejs backend, we can use object proxy to simulate non-blocking queue, which I think is better than while loop + promise approach~~ I overthink this one, should be possible without object proxy or while + promise, ~~but object proxy can make the solution more elegant~~ I guess i am overthinking this part too

core logic is in `src/stores/queue.ts` under 90 lines(60 lines if we infer the type instead but there is a type problem that is difficult to debug)

no pooling, no unnecessary delay, no queue library, no external services, clean, small and easy to navigate codebase

`src/stores/__creator` is a utility function to create stores, safe to ignore

the rest are UI components

public url: https://dulcet-cassata-e95ba1.netlify.app/

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