# Stage 1: Build the frontend (React with Vite)
FROM node:18 AS build-app
WORKDIR /app/frontend

# Copy only the package.json and yarn.lock files for dependency installation
COPY ./frontend/package.json ./frontend/yarn.lock ./

# Install dependencies using Yarn
RUN yarn install

# Copy the rest of the frontend source code
COPY ./frontend ./

# Build the frontend
RUN yarn build

# Stage 2: Set up the backend and serve the frontend
FROM node:18 AS build-backend
WORKDIR /app

# Copy backend code
COPY ./backend/package.json ./backend/package-lock.json ./backend/
RUN cd backend && npm install

# Ensure the /app/backend/frontend/dist directory exists before copying
RUN mkdir -p /app/backend/frontend/dist

# Copy the built frontend files from the previous stage to the backend folder
COPY --from=build-app /app/frontend/dist /app/backend/frontend/dist

# Copy the rest of the backend code
COPY ./backend ./backend

# Expose the backend port 8080
EXPOSE 8080

# Start the backend server
CMD ["node", "./backend/index.js"]
