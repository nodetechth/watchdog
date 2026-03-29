# WatchDog Capture Lambda - Container Image
# Uses Browserbase for cloud browser, no local Chromium needed

FROM public.ecr.aws/lambda/nodejs:20

# Install minimal dependencies
# Browserbase provides the cloud browser, so no Chromium installation required
RUN dnf install -y \
    ca-certificates \
    && dnf clean all

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source to reduce image size
RUN npm prune --production && rm -rf src tsconfig.json

# Lambda handler
CMD ["dist/index.handler"]
