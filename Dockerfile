# Use an official Node.js image from the Docker Hub
FROM node:14

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install any system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libx11-dev \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libfreetype6 \
    libglib2.0-0 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libpangocairo-1.0-0 \
    libatspi2.0-0 \
    libjpeg62-turbo \
    libgdk-pixbuf2.0-0 \
    wget \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies with increased network timeout
RUN npm set network-timeout 600000 && npm install --verbose

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 7860

# Command to run the application
CMD ["npm", "start"]
