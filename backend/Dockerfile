FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm ci --only=production

# Bundle app source
COPY . .

# Set environment variable
ENV NODE_ENV production

EXPOSE 5000

# Start via PM2 if ecosystem.config.js is provided, otherwise node server.js
CMD ["npm", "start"]
