FROM node:12-alpine

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app
COPY yarn.lock /app
RUN yarn install

# Bundle app source
COPY . /app
RUN yarn build

# Clear the cache
RUN yarn cache clean \
    && rm -rf /var/cache/* \
    && mkdir /var/cache/apk

EXPOSE 3000
CMD [ "yarn", "start" ]