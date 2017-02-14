# docker-consul (WIP)
Image that allows containers which registers to host ports dynamically to register agains consul servers with valid client/server configurations.

## Usage
> make sure to start the consul agent: ENTRYPOINT ["bash", "/opt/nakd-consul/start.sh"]

### Create bootstrap server container
```bash
docker run -p <host:container> -d \
-v /var/run/docker.sock:/var/run/docker.sock \
-e BOOTSTRAP=true -e SERVER=true \
-e ENCRYPT="<KEY>" joelroxell/docker-consul
```

### Create server container
```bash
docker run -p <host:container> -d \
-v /var/run/docker.sock:/var/run/docker.sock \
-e START_JOIN='172.17.0.2' \
-e SERVER=true -e ENCRYPT="<KEY>" \
-e SERVICE_NAME='lilith' joelroxell/docker-consul
```

### Create client container
```bash
docker run -p <host:container> -d \
-v /var/run/docker.sock:/var/run/docker.sock \
-e SERVICE_NAME="<SERVICE_NAME>" \
-e DATACENTER="<DATACENTER>"  \
-e ENCRYPT="<KEY>" \
-e START_JOIN="172.17.0.2" joelroxell/docker-consul
```