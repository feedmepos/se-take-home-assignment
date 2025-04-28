## Getting Started
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

You may test on this [cloud deployment](https://tony-feedme-takehome-assignment.fly.dev/) OR, to test locally on your machine, run:
```bash
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Potential areas of improvements
- This project stores the application states in the server's memory, making it a stateful server application. Should we require to make it deployable and horizontally scalable on a cloud platform (e.g. Vercel), we should shift the states to be stored in a database (eg: redis for cache, postgresql for persistent storage).
- This project also demonstrates certain concepts of OOP. But due to the nature of Next.js, dependency injection and IoC is not as straightforward to implement as compared to a standalone backend service (e.g. Nestjs/Express). To improve on this, we can separate the deployment of backend api service (e.g. Nestjs) from the frontend web server.
- Frontend optimistic UI.
