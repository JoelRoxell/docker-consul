#!/bin/bash
#
# **************************************************************
# This script should be run before the contained app is started.
# **************************************************************
AWS=${AWS:-false}

if [ $AWS = 'true' ]; then
  HOST_IP=$(curl http://169.254.169.254/latest/meta-data/local-ipv4)
else
  # User docker container ip in development mode.
  HOST_IP=$(ifconfig eth0|grep "inet addr:"| awk '{print $2}'| awk -F : '{print $2}')
fi

# Start consul agent.
cp agent.json /consul/config/config.json

echo "runing agent in client mode"
consul agent -config-dir /consul/config -bind $HOST_IP &

HOST_IP node docker-events.js
