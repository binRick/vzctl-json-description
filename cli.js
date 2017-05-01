#!/usr/bin/env node

var program = require('commander'),
    c = require('chalk'),
    config = require('./config'),
    trim = require('trim'),
    child_process = require('child_process'),
    _ = require('underscore'),
    pj = require('prettyjson'),
    localIPs = require('./localIPs'),
parser = require('./parseContainerDescription'),
    validateip = require('validate-ip');

program
    .version('0.0.1')
    .usage('[options] <veid ...>')
    .option('-i --info', 'get networking info for container')
    .option('-n --nat [nat]', 'configure nat on container')
    .option('-p --add-port [addPort]', 'configure container port redirection')
    .option('-s --save', 'save networking configuration')
    .option('-a --apply', 'apply container networking to host system netfilter')
    .option('-r --run', 'run netfilter commands when applying')
    .option('-t --test', 'test container networking')
    .parse(process.argv);

var veid = parseInt(program.args[0]);
if (isNaN(veid)) throw ('specify VEID as last argument');
localIPs.getNetworkIPs(function(err, hostNodeIPs) {
    if (err) throw err;
    parser(veid, function(err, containerNetworking, containerIPs) {
        if (err) throw err;
        if (program.nat) {
            console.log('\tConfiguring all container source ips to nat to host node ip', c.red(program.nat));
            if (!validateip(program.nat)) throw ('Invalid nat address of', program.nat);
            containerNetworking.nats = [];
            _.each(containerIPs, function(containerIP) {
                containerNetworking.nats.push({
                    source: containerIP,
                    to: program.nat
                });
            });
        }
        if (program.addPort) {
            if (containerNetworking.nats.length == 0) {
                console.log(c.red('Container does not have any outbound nat rules to create inbound destination host from'));
                throw ('create nat');
            } else {
                program.addPort = trim(program.addPort);
                console.log('\tAdding Inbound Port!\n', c.yellow(program.addPort));
                var justPort = parseInt(program.addPort);
                var commas = program.addPort.split(',');
                var semicolons = program.addPort.split(':');
                console.log('justport = ', justPort, 'commas length=', commas.length);
                var defaultHostnodeIP = trim(child_process.execSync('ip route| grep ^default|cut -d\' \' -f5| tail -n 1 | xargs -I % ifconfig % | grep \'inet addr:\'| tr -s \' \'| cut -d\':\' -f2| cut -d\' \' -f1').toString());
                if (justPort > 1024 && justPort < 65531 && commas.length == 1 && semicolons.length == 1) {
                    var natHostAddress = defaultHostnodeIP;
                    console.log(c.yellow.bold('Configuring inbound port based on container port', c.white.bgBlack.bold(justPort), 'only. Packets to address', c.white.bgBlack.bold(natHostAddress), ' and port', c.white.bgBlack.bold(justPort), 'on host node will be routed to container at the same port..'));
                    _.each(containerIPs, function(containerIP) {
                        var inboundPort = {
                            destHost: natHostAddress,
                            destPort: justPort,
                            toHost: containerIP,
                            toPort: justPort,
                            protocol: 'tcp',
                        };
                        containerNetworking.inboundPorts.push(inboundPort);
                    });
                } else {
                    console.log('Configuring complex inbound port....');
                }
            }
        }
        if (program.info) {
            console.log('\tShowing info for container!\n');
            console.log(pj.render(containerNetworking, {}));
        }
        if (program.save) {
            console.log('Writing description parameter to string of', JSON.stringify(containerNetworking).length, 'bytes.');
            var cmd = 'vzctl set ' + veid + ' --description=\'' + JSON.stringify(containerNetworking) + '\' --save';
            child_process.execSync(cmd);
        }
        if (program.apply) {
            console.log('Generating Netfiler Commands...');
            var netfilterCommands = [];
            _.each(containerNetworking.nats, function(nat) {
                netfilterCommands.push('iptables -t nat -A POSTROUTING -j SNAT -s ' + nat.source + ' --to ' + nat.to);
            });
            _.each(containerNetworking.inboundPorts, function(inboundPort) {
                netfilterCommands.push('iptables -t nat -A PREROUTING -p tcp -d ' + inboundPort.destHost + ' --dport ' + inboundPort.destPort + ' -j DNAT --to-destination ' + inboundPort.toHost + ':' + inboundPort.toPort + '');
            });
            console.log(pj.render(netfilterCommands));
            if (program.run) {
                console.log(c.yellow.bold('Running netfilter commands!'));
                _.each(netfilterCommands, child_process.execSync);
                console.log(c.green.bold('Completed netfilter commands...'));
            }
        }
        if (program.test) {
            console.log('Testing container networking!!');
            console.log('Tcpdumping for packet in container...');
            //while [ 1 ]; do vzctl exec beef timeout 5 tcpdump -nv -i venet0 port 4435; done
            console.log('Sending packet from remote test server...');
        }
    });
});
