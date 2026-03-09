# Notes for the AI promps

## Backend
### Initialize project
```
Give me a simple Gin (golang) framework with a beautiful project structure.

And next I want to create an order management template with the simple requirements follow this
- The model for "Order" data that contains customer_name, order_type (normal, vip), and order_status (pending, complete).
- A simple REST API for place order (basic CRUD).
- The worker process, Worker can process only one order at the time and take 10 seconds to finish one order.
- A simple REST API for worker's increment and decrement.
- Order process services, To process the incoming orders and order queue adjustment base on the number of workers.

and prepare for the next requirements after this.
```

### Additional Fix #1
```
FIX:

- When create order if input empty string  not provided customer_name should set default as "anonymous"
- When create order if input empty string  not provided order_type should set default as "normal"
- VIP orders should be the first piority to process.
```

### Additional Fix #2
```
FIX:

- About the process to increase or decrese bots should be a simple like input the number from 0 - 100
- Need the live orders process log to file name "manager.log" and should show every action Eg. incoming order, process order, order complete.
- In file manager.log should display follow this 1. current active bots, 2. order status [order inprocess], [order in queue], [completed order], 3. last 10 actions log.
```

### Additional Fix #3
```
FIX:

It's seem we got some bugs here, please create the unittests and make sure the coverate reach 85% for every functions on this projects.

before complete try to run the command and make sure you get the valid results.
```

### Additional Fix #4
```
FIX:

The manager.log still invalid please follow this requirements
- This file should placed at the root of project directory
- I want live log, witch mean the real time system status Eg. bots status, order status, last 10 actions from system.
```

### Requirements Verification #1
```
VERIFY:

base on README.md 
look at the "2. Backend" section (lines 37 - 47) and compare the results, then list the fix requiremets here.
```

### Requirements Verification #2
```
VERIFY:

base on this file @beautifulMention
please apply this template into 'scripts/result.txt' file with the exactly same temple.

- Simulation Results
- Action log with timestamp "[hh:mm:ss] {action text}"
- Final Status
```

### Documentation #1
```
DOCUMENT:

I want to explain this project in the simple way, can you give me the ducmentation for all of APIs, functions, and processes on this project?

And I need the simple one, not complicate and not a diffical technical staff, To be clear, The documents can be read by non-developer like project manager, QA, or tester.
```

### Documentation #2
```
DOCUMENT:

Nice, The next I need a simple functions explanation. Can you write the explanation comments to all APIs, Process, and Sevices as well?
Anyway just a simple one, and the purpose is for the other developer who come to read this project.
```

### Additional Fix #5
```
FIX: 

backend still don't have cors please added cors and only allow for localhost:300 (frontend port)
```

## Frontend
### Initialize project
```
Give me the NextJS (App Router) and base on the created backend project please follow this requirements.

- The simple home page should display the current system status, Eg. bots status, order status, last 10 actions from system.
- APIs services directory with a beautyful and simple structure.
- Tailwind CSS base UI.
- The websocket connection prepare for the realtime system status in the next process.
- A simple unittests for the frontend project.
- A simple documentation for the frontend project.

And prepare for the next requirements after this.
```

### Requirements Verification #1
```
REQUIREMENT:

Cool!!, Now I also want the unittests for frontend for every components as well.
Please make sure the coverage reach the requirement (85% total).
```

### Additional Fix #1
```
FIX:

Still have a failed tests, please verify and fix it as well.
```

### Requireemnts
```
REQUIREMENT

I want to run frontend and backend in as single command.
can you make `scripts/run.sh` support both frontend and backend ?
```