const spawn = require('child_process').spawn;
const path = require('path');
const fs = require('fs');

// Docker processes.
const dockerEvents = spawn('docker', ['events']);
const dockerInspect = function(containerId) {
  return spawn('docker', ['inspect', containerId]);
}

// CONSTANTS
const CONSULE_CONFIG_LOCATION = process.env.CONSULE_CONFIG_LOCATION || '/consul/config/';
const EVENTS = {
  CREATE: 'create',
  ATTACH: 'attach',
  START: 'start',
  DIE: 'die'
}

// List of registerd services on the instance.
let registerdServices = [];

dockerEvents.stdout.on('data', (data) => {
  const payload = data.toString().split(' ');

  const [timeStamp, type, action, containerId] = payload;

  if(!timeStamp.length) {
    return;
  }

  console.log(`[INFO] ${timeStamp}:`, type, action, containerId);

  if(type != 'container') {
    return;
  }

  switch(action) {
    case EVENTS.START:
      onStart(containerId);
      break;
    case EVENTS.DIE:
      onExit(containerId);
      break;
  }
});

dockerEvents.stderr.on('data', (data) => {
  console.log('error')
  console.log(`stderr: ${data}`);
});

dockerEvents.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

function collectContainerInfo(containerId, cb) {
   inspect = dockerInspect(containerId);

  inspect.stdout.on('data', data => {
    const dockerInfo = JSON.parse(data.toString());

    if(!dockerInfo.length) {
      return;
    }

    info = dockerInfo[0];
    labels = info.Config.Labels;
    image = info.Config.Image;
    env = info.Config.Env;
    ports = info.NetworkSettings.Ports;
    hostname = info.Config.Hostname;
    ipAddress = info.NetworkSettings.IPAddress;
    gateway = info.NetworkSettings.Gateway;

    // register container to consul agent and reload.
    cb({
      hostname,
      labels,
      env,
      image,
      ipAddress,
      gateway,
      ports
    });
  });

  inspect.on('close', code => {
    console.log('exit inspect');
  });
}

function createClient(datacenter = 'default', nodeName, encrypt, joins = [], ui = false) {
  return {
    "bootstrap": false,
    "server": false,
    "datacenter": datacenter,
    "node_name": nodeName,
    "data_dir": "/var/consul",
    "encrypt": encrypt,
    "start_join": joins,
    "ui": ui == 'true'
  }
}

function createService(name, tags = [], port) {
  return {
    service: {
      name,
      tags,
      port
    }
  }
}

function createAgentFile(bootstrap = false, server = false, encrypt, joins = [], ui = false) {
  const {
    DATACENTER,
    ENCRYPT,
    BOOTSTRAP,
    SERVER,
    BOOTSTRAP_EXPECT,
    HOSTNAME,
    START_JOIN
  } = process.env;

  let agent;

  agent = createClient(DATACENTER, HOSTNAME, ENCRYPT, START_JOIN.split(','));

  return agent;
}

function collectEnvVariables(envs) {
  res = {};

  envs.map(env => {
    const [a, b] = env.split('=');

    res[a] = b;
  });

  return res;
}

// Collect container information on container start and register to consul.
function onStart(containerId) {
  collectContainerInfo(containerId, data => {
    environment = collectEnvVariables(data.env);

    let {
      SERVICE_NAME,
      TAGS
    } = environment;

    TAGS = TAGS || '';
    let port = null;

    if (data.ports) {
      keys = Object.keys(data.ports);

      port = data.ports[keys[0]][0];
    }


    if(port.hasOwnProperty('HostPort'))
      port = port.HostPort;

    let agent = createService(SERVICE_NAME, TAGS.split(','), port);

    fs.writeFile(path.join(CONSULE_CONFIG_LOCATION, `${SERVICE_NAME}.json`), JSON.stringify(agent), (err) => {
      if(err) {
        console.log(err);
        return;
      }

      console.log(`[INFO]: ${SERVICE_NAME}.json`);

      registerdServices.push({
        containerId,
        fileName: SERVICE_NAME
      });

      reloadConsul();
    });
  });
}

// Deregister consul service on container termination.
function onExit(containerId) {
  service = registerdServices.find(service => service.containerId == containerId);

  if (!service) {
    return;
  }

  fs.unlink(path.join(CONSULE_CONFIG_LOCATION, service.fileName + '.json'), function() {
    registerdServices.splice(registerdServices.indexOf(service), 1);

    console.log(registerdServices);

    reloadConsul();
  });
}

// Reload consul configuration.
function reloadConsul() {
  consulReload = spawn('consul', ['reload']);

  consulReload.stdout.on('data', data => {
    console.log(data);
  });

  consulReload.stderr.on('data', data => {
    console.log(data);
  });

  consulReload.on('close', code => {
    console.log(code);
  });
}
