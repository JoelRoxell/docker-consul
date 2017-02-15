# docker-consul (WIP)
Image which registers containers with dynamic port allocation to a consul clusters on start.

## Usage
> make sure to start the consul agent within your entrypint: `/opt/nakd-consul/start.sh &`

*To leave consul cluster on exit follow this example:*
```bash
#!/bin/bash

# Catch termination signal
trap 'kill -TERM $PID; wait $PID' SIGINT SIGTERM

# Start consul agent
/opt/nakd-consul/start.sh &

# Start application
node /opt/src/index.js &

# Wait for sub-process to finish.
PID=$!
wait $PID

# Leave consule cluster before termination.
consul leave
```


### Create bootstrap agent
```bash
docker run -p host:container -d \
-v /var/run/docker.sock:/var/run/docker.sock \
-e BOOTSTRAP=true \
-e SERVER=true \
-e ENCRYPT="KEY" \
joelroxell/docker-consul
```

### Create server agent
```bash
docker run -p host:container -d \
-v /var/run/docker.sock:/var/run/docker.sock \
-e START_JOIN='SERVER_IP_1' \
-e SERVER=true -e ENCRYPT="KEY" \
-e SERVICE_NAME='SERVICE_NAME' \
joelroxell/docker-consul
```

### Create client agent
```bash
docker run -p host:container -d \
-v /var/run/docker.sock:/var/run/docker.sock \
-e SERVICE_NAME="SERVICE_NAME" \
-e DATACENTER="DATACENTER"  \
-e ENCRYPT="KEY" \
-e START_JOIN="SERVER_IP_1, SERVER_IP_2" \
joelroxell/docker-consul
```
