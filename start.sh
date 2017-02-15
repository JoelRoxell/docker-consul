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

# Leave consul cluster on exit. copy past to you entrypoint script.
#trap "consul leave; exit 0" SIGINT SIGTERM
#!/bin/bash
# # Catch termination signals
# trap 'kill -TERM $PID; wait $PID' SIGINT SIGTERM
# # Start consul agent
# /opt/nakd-consul/start.sh &

# # Start application
# node /opt/src/index.js &

# # Wait for sub-process to finish.
# PID=$!
# wait $PID

# # Leave consule cluster before termination.
# consul leave

