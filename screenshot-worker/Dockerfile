FROM mcr.microsoft.com/playwright:v1.55.0-noble
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npx tsc --outDir dist --module NodeNext --target ES2022 --moduleResolution NodeNext --strict --skipLibCheck
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node","dist/index.js"]
