#!/bin/bash
#
# **************************************************************
# This script should be run before the contained app is started.
# **************************************************************

AWS={$AWS:=''}

if [ $AWS == 'true' ]
then
  HOST_IP=$(curl http://169.254.169.254/latest/meta-data/local-ipv4)
else
  # User docker container ip in development mode.
  HOST_IP=$(ifconfig eth0|grep "inet addr:"| awk '{print $2}'| awk -F : '{print $2}')
fi

# Create consul service configuration.
python3 /opt/nakd-consul/utils/create-container-info.py

# Start consul agent.
consul agent -config-dir /consul/config -bind $HOST_IP &

# Leave consul cluster on exit. copy past to you entry point
#trap "consul leave; exit 0" SIGINT SIGTERM
