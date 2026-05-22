# Step 1: Use an official Node.js base image
FROM node:18-alpine

# Step 2: Set working directory inside the container
WORKDIR /usr/src/app

# Step 3: Copy only package files first (for efficient caching)
COPY package*.json ./

# Step 4: Install dependencies
RUN npm install --production

# Step 5: Copy the rest of the app source code
COPY . .

# Step 6: Expose the application port
EXPOSE 3000

# Step 7: Set environment variables (optional)
ENV ENVIRONMENT=production

# Step 8: Define the command to run the app
CMD ["npm", "start"]
