# Installation

Smocker can be installed either with [Docker](https://www.docker.com/) or manually on any Linux system, depending on your needs.

## With Docker

```sh
docker run -d \
  --restart=always \
  -p 8080:8080 \
  -p 8081:8081 \
  --name smocker \
  thiht/smocker
```

or with TLS enabled:

```sh
docker run -d \
  --restart=always \
  -p 44300:8080 \
  -p 44301:8081 \
  -e SMOCKER_TLS_ENABLE=true \
  -v /path/to/your/cert.pem:/etc/smocker/tls/certs/cert.pem:ro
  -v /path/to/your/key.pem:/etc/smocker/tls/private/key.pem:ro
  --name smocker \
  thiht/smocker
```

## Manual Deployment

::: tip Note
The official binaries are currently built for Linux only. This is not a hard limit though, as the source code should be fully compatible with most of the standard platforms.
:::

```sh
# This will be the deployment folder for the Smocker instance
mkdir -p /opt/smocker && cd /opt/smocker
wget -P /tmp https://github.com/Thiht/smocker/releases/latest/download/smocker.tar.gz
tar xf /tmp/smocker.tar.gz
rm /tmp/smocker.tar.gz

nohup ./smocker -mock-server-listen-port=8080 -config-listen-port=8081 &

# Or with TLS

# The certificate is expected in /etc/smocker/tls/certs/ by default
# You can override it with -tls-cert-file and -tls-private-key-file
nohup ./smocker -mock-server-listen-port=44300 -config-listen-port=44301 -tls-enable &
```

## Healthcheck

To check that Smocker started successfully, just run the following command:

```sh
curl localhost:8081/version
```

or with TLS enabled:

```sh
curl https://localhost:44301/version

# Or if you use a self signed certificate
curl -k https://localhost:44301/version
```
