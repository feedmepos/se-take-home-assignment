## FeedMe Software Engineer Take Home Assignment
Below is a take home assignment before the interview of the position. You are required to
1. Understand the situation and use case. You may contact the interviewer for further clarification.
2. Fork this repo and implement the requirement with your most familiar tools.
3. Complete the requirement and perform your own testing.
4. Provide documentation for the any part that you think is needed.
5. Commit into your own github and share your repo with the interviewer.
6. Bring the source code and functioning prototype to the interview session.

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
6. When "- Bot" clicked, the newest bot should be destroyed. If the bot is processing an order, it should also stop the process. The order now back to "PENDING" and ready to process by other bot.
7. No data persistance is needed for this prototype, you may perform all the process inside memory.

### Functioning Prototype
You may demostrate your final funtioning prototype with **one and only one** of the following method:
- CLI application
- UI application
- E2E test case

### Tips on completing this task
- Testing, testing and testing. Make sure the prototype is functioning and meeting all the requirements.
- Do not over engineering. Try to scope your working hour within 3 hours (1 hour per day). You may document all the optimization or technology concern that you think good to bring in the solution.
- Complete the implementation as clean as possible, clean code is a strong plus point, do not bring in all the fancy tech stuff.

## Answer Description

### Features
- **Order Management**: Users can place new normal or VIP orders and view them categorized as pending, processing, or completed.
- **Bot Management**: Users can add or remove bots to process pending orders.
- **Cancellation**: Users can cancel pending orders if necessary.

### Installation

1. Clone this repository to your local machine:

```
git clone https://github.com/TheRealNaery/se-take-home-assignment.git
```
2. Navigate to the project directory:

```
cd feedme
```

3. Install dependencies using npm or yarn:

```
npm install
```

4. Run the development server:

```
npm run serve
```

5. Visit http://localhost:8080 in your web browser to access the application.

### Example

1. To test the answer, please run through `example/index.html`

### Usage

1. **Place New Orders**: Click on the "New Normal Order" or "New VIP Order" buttons to place new orders. Each order will be displayed in the pending orders section.
2. **Manage Bots**: Use the "+ Bot" and "- Bot" buttons to add or remove bots for processing orders. Bots help automate the order processing.
3. **Cancel Orders**: To cancel a pending order, click the "Cancel" button next to the order in the pending orders section.
4. **View Order Status**: Orders are categorized into pending, processing, and completed sections based on their status. You can track the status of each order accordingly.

### Technologies Used
- Vue 3
- Tailwind CSS

### License
This project is licensed under the MIT License.
