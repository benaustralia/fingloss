# Use Node.js 20 Alpine for Firebase v12 compatibility
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Expose port 5173 (Vite default)
EXPOSE 5173

# Start development server with hot reloading
CMD ["npm", "run", "start"]
