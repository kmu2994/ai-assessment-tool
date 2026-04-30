# Frontend Dockerfile — Multi-stage production build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage — lightweight static server
FROM node:18-alpine

WORKDIR /app

# Install serve to run the built app
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Expose port (matches docker-compose and Vite dev server config)
EXPOSE 3000

# Run the application
CMD ["serve", "-s", "dist", "-l", "3000"]
