FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production=false

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create downloads directory for scraper
RUN mkdir -p /app/downloads

EXPOSE 4000

CMD ["node", "dist/index.js"]
