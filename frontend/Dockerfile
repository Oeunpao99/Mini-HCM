FROM node:18

WORKDIR /app

# Install dependencies first to leverage Docker cache
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps || npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
