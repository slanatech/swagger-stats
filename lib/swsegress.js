/* swagger=stats egress http monitor */

const path = require('path');
const swsSettings = require('./swssettings');
const SwsProcessor = require('./swsProcessor');
const swsUtil = require('./swsUtil');
const debug = require('debug')('sws:egress');
const url = require('url');
const qs = require('qs');
let http = require('http');

let originalRequest = null;

/* swagger=stats egress http monitor */
class SwsEgress {

    constructor() {
        // TODO
    }

    init() {
        // Process Options
        if(swsSettings.enableEgress){
            this.enableEgressMonitoring();
        }
    }

    enableEgressMonitoring(){
        originalRequest = http.request;
        http.request = wrapMethodRequest;
    }

    handleRequest(req) {
        let h = req.getHeader('host')
        debug(`Got request: ${req.method} ${h} ${req.path}`);
        req.once('response', (res) => {
            const ip = req.socket.localAddress;
            const port = req.socket.localPort;
            debug(`Got response to request: ${res.statusCode} ${res.statusMessage}`);
            // Consume response object
        });
    }

}

let swsEgress = new SwsEgress();

function wrapMethodRequest(...args) {
    let req = originalRequest.apply(this, arguments);
    swsEgress.handleRequest(req);
    return req;
};
// TODO get


module.exports = swsEgress;
