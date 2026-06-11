# Use Node 24 base image
FROM node:24

# Install canvas dependencies
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Build Next.js app
RUN npm run build

# Expose port (Azure expects 3000)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
