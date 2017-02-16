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

  if(!timeStamp.length || !containerId) {
    return;
  }

  console.log(`[INFO] ${timeStamp}:`, type, action, containerId.substring(0, 12));

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
  console.log(`[INFO] ${new Date().toISOString()}: child process exited with code ${code}`);
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
    console.log(`[INFO] ${new Date().toISOString()}: finished container inspection`);
  });
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

    if (!SERVICE_NAME) {
      return;
    }

    TAGS = TAGS || '';

    let port = {};

    if (data.ports) {
      keys = Object.keys(data.ports);

      if(keys.length > 0) {
        port = data.ports[keys[0]][0];
      }
    }


    if(port.hasOwnProperty('HostPort'))
      port = port.HostPort;

    if(isNaN(port)) {
      return;
    }

    let agent = createService(SERVICE_NAME, TAGS.split(','), parseInt(port));


    const fileName = Math.random().toString(36).substring(7);

    console.log(`[INFO] ${new Date().toISOString()}: writing ${fileName}.json`);
    fs.writeFile(path.join(CONSULE_CONFIG_LOCATION, `${fileName}.json`), JSON.stringify(agent), (err) => {
      if(err) {
        return console.log(err);
      }

      console.log(`[INFO] ${new Date().toISOString()}: write completed.`);

      registerdServices.push({
        containerId,
        fileName
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
    console.log(`[INFO] ${new Date().toISOString()}: removed ${service.fileName}.json`);
    reloadConsul();
  });
}

// Reload consul configuration.
function reloadConsul() {
  consulReload = spawn('consul', ['reload']);

  consulReload.stdout.on('data', data => {
    console.log(data.toString());
  });

  consulReload.stderr.on('data', data => {
    console.log(data.toString());
  });

  consulReload.on('close', code => {
    // console.log(code);
  });
}
