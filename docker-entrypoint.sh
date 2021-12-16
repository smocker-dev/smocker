#!/bin/bash

set -meo pipefail

if [[ ! $SMOCKER_INIT_SCRIPTS_PATH ]]
then
  SMOCKER_INIT_SCRIPTS_PATH=/docker-entrypoint-init.d
fi

if [[ ! $SMOCKER_CONFIG_LISTEN_PORT ]]
then
  SMOCKER_CONFIG_LISTEN_PORT=8081
fi

_wait_server_started() {
  timeout 30 sh -c \
    "until curl -sSf localhost:$SMOCKER_CONFIG_LISTEN_PORT/version > /dev/null 2>&1; do
      sleep 1
    done"
}

_reset_mocks() {
  curl -sSf -XPOST "localhost:$SMOCKER_CONFIG_LISTEN_PORT/reset?force=true" > /dev/null 2>&1
}

_run_init() {
  for f in $SMOCKER_INIT_SCRIPTS_PATH/*; do
    case "$f" in
      *.sh)
        echo "$0: running $f"
        # run script
        . "$f" ;;
      *.yml|*.yaml)
        echo "$0: uploading $f"
        # upload mock via api
        curl -sSf -XPOST \
          --header "Content-Type: application/x-yaml" \
          --data-binary "@$f" \
          "localhost:$SMOCKER_CONFIG_LISTEN_PORT/mocks" \
          > /dev/null 2>&1 ;;
      *)
        echo "$0: ignoring $f" ;;
    esac
  done
}

# start process in background
exec "$@" &

if [[ -d $SMOCKER_INIT_SCRIPTS_PATH ]]
then
  _wait_server_started
  _reset_mocks
  _run_init
fi

# bring process back to foreground
fg %1 > /dev/null
