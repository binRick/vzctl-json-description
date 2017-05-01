var child_process = require('child_process'),
    c = require('chalk'),
    async = require('async');


var veid = 'beef';
var getDescCmd = 'vzlist -Ho description ' + veid;

try {
    var descriptionJson = JSON.parse(child_process.execSync(getDescCmd).toString());
} catch (e) {
    var descriptionJson = {}
};

descriptionJson.redirections = descriptionJson.redirections || [];
descriptionJson.nats = descriptionJson.nats || [];
var redirect = {
    destHost: '66.35.78.2',
    destPort: 3000,
    toHost: '10.23.23.21',
    toPort: 3000,
    protocol: 'tcp',
};
var nat = {
    source: '10.23.23.21',
    to: '66.35.78.2',
};
descriptionJson.redirections.push(redirect);
descriptionJson.nats.push(nat);
var cmd = 'vzctl set ' + veid + ' --description=\'' + JSON.stringify(descriptionJson) + '\' --save';
if (process.env['debug'] == '1')
    console.log(cmd, '\n', getDescCmd, '\n', descriptionJson);
child_process.execSync(cmd);

descriptionJson = JSON.parse(child_process.execSync(getDescCmd).toString());
console.log('veid', veid, 'has', descriptionJson.redirections.length, 'redirections');
console.log('and', descriptionJson.nats.length, 'nats');
