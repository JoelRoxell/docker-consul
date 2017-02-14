#!/bin/bash
AWS={$AWS:=''}

if [ $AWS == 'true' ]
then
  HOST_IP=$(curl http://169.254.169.254/latest/meta-data/local-ipv4)
else
  HOST_IP=$(ifconfig eth0|grep "inet addr:"| awk '{print $2}'| awk -F : '{print $2}')
fi

# Create consul service configuration.
python3 ./utils/create-container-info.py

# Start consul agent.
consul agent -config-dir /consul/config -bind $HOST_IP &

# Leave consul cluster on exit.
trap "consul leave; exit 0" SIGINT SIGTERM

while :
do
  sleep 2
  # This loop illustrates a running app inside the container.
done
