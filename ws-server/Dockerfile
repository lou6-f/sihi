FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
