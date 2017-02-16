#!/bin/bash
#
# **************************************************************
# This script should be run before the contained app is started.
# **************************************************************

AWS=${AWS:-false}
BOOTSTRAP=${BOOTSTRAP:-false}
SERVER=${SERVER:-false}

if [ $AWS = 'true' ]; then
  HOST_IP=$(curl http://169.254.169.254/latest/meta-data/local-ipv4)
else
  # User docker container ip in development mode.
  HOST_IP=$(ifconfig eth0|grep "inet addr:"| awk '{print $2}'| awk -F : '{print $2}')
fi

# Create consul agent configuration.
python3 /opt/nakd-consul/utils/create-container-info.py

# Start consul agent.
if [ $BOOTSTRAP = 'true' ] || [ $SERVER = 'true' ]; then
  echo "running bootstrap run consul in foreground"
  consul agent -config-dir /consul/config -bind $HOST_IP
else
  echo "runing agent in client mode"
  consul agent -config-dir /consul/config -bind $HOST_IP &
fi
