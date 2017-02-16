import subprocess
import os
import json

# Hostname is based on the containers id.
HOSTNAME = os.getenv('HOSTNAME')

# Consule definitions.
SERVICE_NAME = os.getenv('SERVICE_NAME', 'service')
NODE_ENV = os.getenv('NODE_ENV', 'development')
BOOTSTRAP = os.getenv('BOOTSTRAP', 'false')
SERVER = os.getenv('SERVER', 'false')
DATACENTER = os.getenv('DATACENTER', 'default')
NODE_NAME = os.getenv('NODE_NAME', HOSTNAME)
ENCRYPT = os.environ['ENCRYPT'] # will throw exception if non-existent.
START_JOIN = os.getenv('START_JOIN', '')
BOOTSTRAP_EXPECT = os.getenv('BOOTSTRAP_EXPECT', 3)
UI = os.getenv('UI', False)

def get_port_configuration():
    """Gather port assignments for container"""

    # Get descriptive information of the container from docker.
    result = subprocess.check_output(
        ['docker', 'inspect', HOSTNAME],
        universal_newlines=True
    )
    json_obj = json.loads(result)
    port_config = json_obj[0]['NetworkSettings']['Ports']
    ports = []

    for container_port in port_config:
        host_port = port_config[container_port][0]['HostPort']
        ports.append(host_port)

    return ports


def generate_service_json(service_name, service_port):
    """
    Generates a new sevice definition used in consule.
    """

    skeleton = json.dumps({
        "service":
            {
                "name": service_name,
                "port": int(service_port),
                "checks": [{
                    "script": "curl 0.0.0.0:{}".format(service_port),
                    "interval": "25s"
                }]
            }
        }, separators=(',', ':'))


    return skeleton



def create_service_file():
    """
    Create consul service config(<SERVICE_NAME>.json).
    """

    ports = get_port_configuration()

    if not len(ports) > 0:
        return

    # Write service file
    service_file = open('/consul/config/service.json', 'w+')
    service_file.write(generate_service_json(SERVICE_NAME, ports[0]))
    service_file.close()


def create_server_skeleton(
        bootstrap,
        server,
        datacenter,
        encrypt,
        start_join
    ):
    """
    Generate server file configuration json.
    """

    skeleton = {}

    if bootstrap == 'true':
        skeleton = json.dumps({
            "bootstrap": bootstrap in ['true', 'True', '1'],
            "server": server in ['true', 'True', '1'],
            "datacenter": datacenter,
            "node_name": NODE_NAME,
            "data_dir": "/var/consul",
            "encrypt": encrypt,
            "log_level": "INFO",
            "ui": UI in ['true']
        })
    else:
        if len(start_join) > 1:
            joins = start_join.split(',')

        skeleton = json.dumps(
            {
                "bootstrap": False,
                "server": server in ['true', 'True', '1'],
                "datacenter": datacenter,
                "node_name": NODE_NAME,
                "data_dir": "/var/consul",
                "encrypt": encrypt,
                "start_join": joins,
                "ui": UI in ['true'],
                "bootstrap_expect": int(BOOTSTRAP_EXPECT)
            }, separators=(',', ':')
        )

    return skeleton


def create_server_file():
    """
    Write config.json
    """

    server_config = create_server_skeleton(
        bootstrap=BOOTSTRAP,
        server=SERVER,
        datacenter=DATACENTER,
        encrypt=ENCRYPT,
        start_join=START_JOIN
    )

    service_file = open('/consul/config/config.json', 'w+')
    service_file.write(server_config)
    service_file.close()


def main():
    """
    main script function
    """

    create_service_file()
    create_server_file()
    print('[INFO]: Generated consul configuration files')


if __name__ == '__main__':
    main()
