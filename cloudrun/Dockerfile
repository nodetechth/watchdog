# WatchDog Capture Service Dockerfile
# Base image with Node.js 20
FROM node:20-slim

# Install minimal dependencies (Browserbase provides cloud browser, no local Chrome needed)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Start the server
CMD ["node", "dist/index.js"]
