FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build arguments for environment variables
ARG VITE_SERVER_URL
ARG VITE_WS_URL

# Set environment variables for build and runtime
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

# Build the application
RUN npm run build

# Expose port 4173 (Vite preview default port)
EXPOSE 4173

# Start Vite preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]

