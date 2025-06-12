# Use Node.js 20 as base image
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install TypeScript globally for building
RUN npm install -g typescript

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

FROM node:20-alpine AS app

# Set working directory
WORKDIR /app

# Copy the built application from builder stage
COPY --from=builder /build/node_modules /app/node_modules
COPY --from=builder /build/build /app

# Set the entrypoint with dumb-init for proper signal handling
ENTRYPOINT ["node", "index.js"]