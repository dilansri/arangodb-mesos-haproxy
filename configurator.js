'use strict';

const fs = require('fs');
const dns = require('dns');
const http = require('http');
const exec = require('child_process').exec;

if (process.argv.length < 3) {
  console.error("Usage: " + process.argv[1] + " <framework-name>");
}

let template = fs.readFileSync('/haproxy.cfg.template', {encoding: 'utf8'});
let currentConfig = '';
let frameworkName = process.argv[2];

let isReconfiguring = false;
function reconfigure() {
  let portPromise = new Promise((resolve, reject) => {
    dns.resolveSrv('_framework._' + frameworkName + '._tcp.marathon.mesos', (err, result) => {
      if (err) {
        reject("Couldn't retrieve SRV entries for framework " + frameworkName + ": " + err);
        return;
      }

      if (result.length < 0) {
        reject("Got non-error but actually didn't find any SRC records for " + frameworkName);
        return;
      }

      resolve(result[0].port);
    });
  });
  
  let hostPromise = new Promise((resolve, reject) => {
    dns.lookup(frameworkName + '.mesos', (err, address) => {
      if (err) {
        reject("Couldn't resolve " + frameworkName + '.mesos: ' + err);
        return;
      }
      
      resolve(address);
    });
  });

  Promise.all([hostPromise, portPromise])
  .then(result => {
    return new Promise((resolve, reject) => {
      http.get('http://' + result[0] + ':' + result[1] + '/v1/endpoints.json', res => {
        var body = '';

        res.on('data', function(chunk){
          body += chunk;
        });

        res.on('end', function() {
          try {
            var json = JSON.parse(body);
            resolve(json.coordinators);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', err => {
        reject(err);
      });
    });
  })
  .then(coordinators => {
    return coordinators.map((coordinator, index) => {
      return 'server coordinator' + index + ' ' + coordinator.replace(/^https?:\/\//, '');
    })
    .join('\n');
  })
  .then(coordinatorSection => {
    let newConfig = template.replace(/### COORDINATORS ###/, coordinatorSection);
    newConfig = newConfig.replace(/### PORT ###/, process.env.PORT0);
    if (newConfig != currentConfig) {
      fs.writeFileSync('/etc/haproxy/haproxy.cfg', newConfig);
      currentConfig = newConfig;
      let command;
      // reload does only work if it was really existing
      if (currentConfig == '') {
        command = 'restart';
      } else {
        command = 'reload';
      }
      return new Promise((resolve, reject) => {
        exec('/etc/init.d/haproxy ' + command, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  })
  .then(() => {
    setTimeout(reconfigure, 10000);
  })
  .catch(err => {
    console.error(err);
    setTimeout(reconfigure, 10000);
  });
}

process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  process.exit();
});

reconfigure();
