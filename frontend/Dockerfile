
# Stage 1: Build the React frontend
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source and build
COPY . .
RUN npm run build

# Stage 2: Serve the frontend with Nginx
FROM nginx:stable-alpine

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled frontend files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
