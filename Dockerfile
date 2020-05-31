FROM golang:1.14-alpine AS build-backend
ARG VERSION=snapshot
ARG COMMIT
WORKDIR /go/src/github.com/Thiht/smocker
RUN apk add --no-cache make && \
  make VERSION=$VERSION COMMIT=$COMMIT RELEASE=1 build

FROM node:12-alpine AS build-frontend
WORKDIR /wd
COPY . .
ENV PARCEL_WORKERS 1
RUN yarn install --frozen-lockfile && \
  yarn build

FROM alpine
COPY --from=build-backend /go/src/github.com/Thiht/smocker/build/* /opt/
COPY --from=build-frontend /wd/build/* /opt/
WORKDIR /opt
EXPOSE 8080 8081
CMD ["/opt/smocker"]
