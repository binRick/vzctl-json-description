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
    descriptionJson.redirections = descriptionJson.redirections || [];
    descriptionJson.nats = descriptionJson.nats || [];
_cb(null, descriptionJson);

};
