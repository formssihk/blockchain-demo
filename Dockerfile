# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy the frontend package files and install dependencies using yarn
COPY frontend/package*.json ./
COPY frontend/yarn.lock ./
RUN yarn install

# Copy the entire frontend source code and build it
COPY frontend/ ./
RUN yarn build

# Print the contents of the build directory to verify build success
RUN ls -la /app/frontend/dist/

# Stage 2: Build backend and serve frontend
FROM node:18-alpine AS backend

WORKDIR /app/backend

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install

# Copy backend source code
COPY backend/ ./

# Copy the frontend build to the backend's public folder
COPY --from=frontend-build /app/frontend/dist/ ./public/

# Print the contents of the public directory to verify frontend is copied
RUN ls -la ./public/

# Expose backend server port
EXPOSE 3000

# Start the backend server
CMD ["node", "index.js"]
