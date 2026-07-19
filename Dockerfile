# The images are assembled from pre-built, static, client-embedded binaries (see
# `make build-binaries`) — no compilation happens here, just packaging. buildx sets
# TARGETOS/TARGETARCH/TARGETVARIANT per target platform, which selects the matching binary.

# CA roots for the proxy mock type's HTTPS backends (scratch ships none). Pin to the build
# platform: the cert bundle is arch-independent, so it's produced once natively and no target
# platform ever runs a RUN step — the per-arch stage is COPY-only, so no QEMU emulation is needed.
FROM --platform=$BUILDPLATFORM alpine:3 AS certs
RUN apk add --no-cache ca-certificates

FROM scratch
LABEL org.opencontainers.image.source="https://github.com/smocker-dev/smocker"
EXPOSE 8080 8081
ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT
COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY build/smocker-${TARGETOS}-${TARGETARCH}${TARGETVARIANT} /smocker
# Run unprivileged (nobody); ports are >1024 and a mounted persistence dir must be writable by it.
USER 65534:65534
ENTRYPOINT ["/smocker"]
