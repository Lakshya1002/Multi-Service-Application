# Use the custom base image we defined
FROM my-node-base:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies (only production) and clean npm cache to minimize layer size
RUN npm install --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Set permissions for node user
RUN chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 5000

# Start command
CMD ["node", "server.js"]

