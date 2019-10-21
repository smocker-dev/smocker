FROM golang:1.13-alpine AS build-backend
ARG VERSION=snapshot
WORKDIR /go/src/github.com/Thiht/smocker
COPY . .
RUN apk add git make && \
  make VERSION=$VERSION RELEASE=1 build-backend

FROM node:10-alpine AS build-frontend
WORKDIR /wd
COPY . .
RUN yarn install --frozen-lockfile && \
  yarn build

FROM alpine
COPY --from=build-backend /go/src/github.com/Thiht/smocker/build/* /opt/
COPY --from=build-frontend /wd/build/* /opt/
WORKDIR /opt
EXPOSE 8080 8081
CMD ["/opt/smocker"]
