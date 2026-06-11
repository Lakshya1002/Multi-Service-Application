# Custom Node Base Image
FROM node:20-alpine

# Update packages for security
RUN apk update && apk upgrade

# Set standard node environment variables
ENV NODE_ENV=production

# Set up a working directory
WORKDIR /app

# The user 'node' is created by default in the node image
# We will use this user in the child images for security
