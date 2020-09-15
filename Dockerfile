FROM node:alpine

COPY package.json /worker/

WORKDIR /worker/

RUN npm i

COPY app.js /worker/
COPY autoCull.js /worker/
COPY autoSave.js /worker/
COPY helpers /worker/helpers

ENV PROD=true

#ENTRYPOINT node app