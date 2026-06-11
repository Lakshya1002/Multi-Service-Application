# Stage 1: Build the React Application
FROM my-node-base:20-alpine AS builder

# Set NODE_ENV to development so devDependencies (like Vite) are installed for building
ENV NODE_ENV=development

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the project for production
RUN npm run build

# Stage 2: Serve the application using a lightweight web server
FROM nginx:alpine

# Copy custom nginx configuration for frontend static serving
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for the internal network
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

