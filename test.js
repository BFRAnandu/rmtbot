var ping = require('ping');
 
var hosts = ['Backup-Server.home.robinsmediateam.dev', 'eminem.home.robinsmediateam.dev', 'yahoo.com'];
hosts.forEach(function(host){
    ping.sys.probe(host, function(isAlive){
        var msg = isAlive ? 'host ' + host + ' is alive' : 'host ' + host + ' is dead';
        console.log(msg);
    });
});