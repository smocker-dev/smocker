# Getting Started

## Installation

Smocker can be installed either with [Docker](https://www.docker.com/) or manually on any Linux system, depending on your needs.

### With Docker

```sh
docker run -d \
  --restart=always \
  -p 8080:8080 \
  -p 8081:8081 \
  --name smocker \
  thiht/smocker
```

### Manual Deployment

```sh
# This will be the deployment folder for the smocker instance
mkdir -p /opt/smocker && cd /opt/smocker
wget -P /tmp https://github.com/Thiht/smocker/releases/latest/download/smocker.tar.gz
tar xf /tmp/smocker.tar.gz
rm /tmp/smocker.tar.gz
nohup ./smocker -mock-server-listen-port=8080 -config-listen-port=8081 &
```

### Healthcheck

To check that Smocker started successfully, just run the following command:

```sh
curl localhost:8081/version
```
