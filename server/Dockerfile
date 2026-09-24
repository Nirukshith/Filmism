# Use the official Node.js 22 LTS Alpine image (super lightweight & secure)
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application source code
COPY . .

# Expose the backend port
EXPOSE 5001

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"]
