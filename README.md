## Design

- application to handle bots and process orders made realtime
- main logic held in the kitchen.js (`src/kitchen.js`)
  - handles *VIP*, *Normal* and *Complete* queues
  - handles the worker bots that process orders
  - recieves events and handles them based on the given requirements
- worker file (`src/bot.js`) that processes orders. in this case is simply a delay to emulate a real world process
- contains a folder for helper files containing handlers for the counters (singleton) and some generic functions formatting
- uses a `.env` file to store defaut values
time taken in seconds
- test folder that contains all the unit tests for the program
- `commands.js` is the file that contains the instruction set for events
- `app.js` is the main entry point into the app and is where we load the commands for the program


## Config file settings
### **.env**
---
>`
DEFAULT_ORDER_PROCESS_TIME = 10 //used to define the default order if not defined
`

### **commands.js**
in this js file, there is an array named `eventQueue` containing objects that are used to simulate event triggers
*do note, they do not need to be ordered*

**heres a sample:**
```
[
  {
    delay: 0,
    eventType: EventType.ORDER_CREATE,
    options: {
      orderType: OrderType.NORMAL,
      orderProcessTime: 10,
    },
  },
  {
    delay: 1,
    eventType: EventType.ORDER_CREATE,
    options: {
      orderType: OrderType.VIP,
      orderProcessTime: 10,
    },
  },
  {
    delay: 1,
    eventType: EventType.ORDER_CREATE,
    options: {
      orderType: OrderType.NORMAL,
      orderProcessTime: 10,
    },
  },
  {
    delay: 14,
    eventType: EventType.ORDER_CREATE,
    options: {
      orderType: OrderType.VIP,
      orderProcessTime: 10,
    },
  },

  {
    delay: 2,
    eventType: EventType.BOT_CREATE,
  },
  {
    delay: 3,
    eventType: EventType.BOT_CREATE,
  },
  {
    delay: 24,
    eventType: EventType.BOT_KILL,
    options: {
      id: `2`,
    },
  },
]
```
**breakdown of each events command**

- **delay** : intever, of when the event is to trigger
- **eventType** : string, `BOT_CREATE`, `BOT_KILL` or `ORDER_CREATE`
- **options** : optional object, if we want to set more configs
  - **orderType**: string, if eventType:*`ORDER_CREATE`*, may be `NORMAL` or `VIP`
  - **orderProcessTime**: integer, if eventType:*`BOT_KILL`* should contain the bot id to kill (bots generated in sequential order)