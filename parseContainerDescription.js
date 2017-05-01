var child_process = require('child_process'),
    c = require('chalk'),
    async = require('async');
module.exports = function(veid, _cb) {
    var getDescCmd = 'vzlist -Ho description ' + veid;
    try {
        var descriptionJson = JSON.parse(child_process.execSync(getDescCmd).toString());
    } catch (e) {
            var descriptionJson = {}
    };
    descriptionJson.inboundPorts = descriptionJson.inboundPorts || [];
    descriptionJson.nats = descriptionJson.nats || [];
    var ips = JSON.parse(child_process.execSync('vzlist -jHo ip ' + veid).toString())[0].ip;
    _cb(null, descriptionJson, ips);

};
