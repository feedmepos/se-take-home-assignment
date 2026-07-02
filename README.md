## FeedMe Software Engineer Take Home Assignment

### Backend Implementation (Node.js CLI)

This repository implements the **backend option** as a Node.js TypeScript CLI application for the McDonald's order controller (cooking bots).

#### Tech Stack
- **TypeScript** (ES Modules) compiled to `dist/` via `tsc`
- **Node.js 22.19.0** (CI version)
- **node:test** + `node:assert` for unit tests (no external test dependencies)
- Real `setTimeout(_, 10000)` for the 10-second processing time

#### Running

**Interactive CLI** (for interview demonstration):
```bash
npm run build
npm start
```
Commands (typed into stdin):
- `new normal` — create a Normal order
- `new vip` — create a VIP order
- `+ bot` — add a cooking bot
- `- bot` — remove the newest cooking bot
- `status` — show current system status
- `help` — list commands
- `exit` — quit

**Simulation mode** (writes timestamped output to stdout):
```bash
npm run build
npm run simulate
```

**CI scripts** (`scripts/`):
- `test.sh` — builds then runs unit tests via `node --test`
- `build.sh` — installs deps and compiles TypeScript to `dist/`
- `run.sh` — builds then runs `--simulate`, redirecting to `scripts/result.txt`

#### Simulation Scenario Coverage

The `--simulate` scenario exercises every requirement:
1. Normal and VIP order creation with priority queueing (VIP ahead of Normal, behind existing VIP)
2. `+Bot` immediately picks up the highest-priority pending order
3. 10-second processing then automatic pickup of the next pending order
4. Multiple bots processing in parallel
5. Idle bots wait for new orders
6. `-Bot` destroys the newest bot; if it was processing, the order returns to its original VIP/Normal priority position and is re-picked-up by a freed bot
7. Manager decreases bots (idle bot destroyed)

All output lines carry `HH:MM:SS` timestamps. `scripts/result.txt` is the CI artifact verified by the `backend-verify-result` workflow.

#### Tests

Unit tests in `src/test/` cover the domain logic without real timers via an injectable scheduler:
- Order numbers start at 1001 and increase uniquely
- VIP priority queueing (ahead of Normal, behind existing VIP)
- `+Bot` pickup and IDLE behavior
- Order completion and automatic next-pickup
- `-Bot` returns in-progress order to its priority position

Run tests:
```bash
npm run build
npm test
```
Below is a take home assignment before the interview of the position. You are required to
1. Understand the situation and use case. You may contact the interviewer for further clarification.
2. implement the requirement with **either frontend or backend components**.
3. Complete the requirement with **AI** if possible, but perform your own testing.
4. Provide documentation for the any part that you think is needed.
5. Bring the source code and functioning prototype to the interview session.

### Situation
McDonald is transforming their business during COVID-19. They wish to build the automated cooking bots to reduce workforce and increase their efficiency. As one of the software engineer in the project. You task is to create an order controller which handle the order control flow. 

### User Story
As below is part of the user story:
1. As McDonald's normal customer, after I submitted my order, I wish to see my order flow into "PENDING" area. After the cooking bot process my order, I want to see it flow into to "COMPLETE" area.
2. As McDonald's VIP member, after I submitted my order, I want my order being process first before all order by normal customer.  However if there's existing order from VIP member, my order should queue behind his/her order.
3. As McDonald's manager, I want to increase or decrease number of cooking bot available in my restaurant. When I increase a bot, it should immediately process any pending order. When I decrease a bot, the processing order should remain un-process.
4. As McDonald bot, it can only pickup and process 1 order at a time, each order required 10 seconds to complete process.

### Requirements
1. When "New Normal Order" clicked, a new order should show up "PENDING" Area.
2. When "New VIP Order" clicked, a new order should show up in "PENDING" Area. It should place in-front of all existing "Normal" order but behind of all existing "VIP" order.
3. The order number should be unique and increasing.
4. When "+ Bot" clicked, a bot should be created and start processing the order inside "PENDING" area. after 10 seconds picking up the order, the order should move to "COMPLETE" area. Then the bot should start processing another order if there is any left in "PENDING" area.
5. If there is no more order in the "PENDING" area, the bot should become IDLE until a new order come in.
6. When "- Bot" clicked, the newest bot should be destroyed. If the bot is processing an order, it should also stop the process. The order should return to its original position in the "PENDING" area (maintaining VIP/Normal order priority).
7. No data persistance is needed for this prototype, you may perform all the process inside memory.

### Functioning Prototype
You must implement **either** frontend or backend components as described below:

#### 1. Frontend
- You are free to use **any framework and programming language** of your choice
- The UI application must be compiled, deployed and hosted on any publicly accessible web platform
- Must provide a user interface that demonstrates all the requirements listed above
- Should allow users to interact with the McDonald's order management system

#### 2. Backend
- You must use **either Go (Golang) or Node.js** for the backend implementation
- The backend must be a CLI application that can be executed in GitHub Actions
- Must implement the following scripts in the `script` directory:
  - `test.sh`: Contains unit test execution steps
  - `build.sh`: Contains compilation steps for the CLI application
  - `run.sh`: Contains execution steps that run the CLI application
- The CLI application result must be printed to `result.txt`
- The `result.txt` output must include timestamps in `HH:MM:SS` format to track order completion times
- Must follow **GitHub Flow**: Create a Pull Request with your changes to this repository
- Ensure all GitHub Action checks pass successfully
- **Note**: An interactive CLI implementation is compulsory for the next round of interview. Candidates should be prepared to demonstrate interactive command handling.

#### Submission Requirements
- Fork this repository and implement your solution with either frontend or backend
- **Frontend option**: Deploy to a publicly accessible URL using any technology stack
- **Backend option**: Must be implemented in Go or Node.js and work within the GitHub Actions environment
  - Follow GitHub Flow process with Pull Request submission
  - All tests in `test.sh` must pass
  - The `result.txt` file must contain meaningful output from your CLI application
  - All output must include timestamps in `HH:MM:SS` format to track order completion times
  - Submit a Pull Request and ensure the `backend-verify-result` workflow passes
- Provide documentation for any part that you think is needed

### Tips on completing this task
- Testing, testing and testing. Make sure the prototype is functioning and meeting all the requirements.
- Utilize coding agent to complete the assignment scope your working hour within 1 hour, do not over engineer it. However, ensure you read and understand what your code doing and apply good engineering practice.
- Complete the implementation as clean as possible, clean code is a strong plus point, do not bring in all the fancy tech stuff.
