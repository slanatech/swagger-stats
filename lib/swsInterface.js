/**
 * Created by sv2 on 2/16/17.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');
const debug = require('debug')('sws:interface');
const promClient = require("prom-client");
const swsSettings = require('./swssettings');
const swsUtil = require('./swsUtil');
const swsProcessor = require('./swsProcessor');
const swsEgress = require('./swsegress');
const swsAuth = require('./swsAuth');
const send = require('send');
const qs = require('qs');
const swsHapi = require('./swsHapi');

// Request hanlder
function handleRequest(req, res){
    try {
        swsProcessor.processRequest(req,res);
    }catch(e){
        debug("SWS:processRequest:ERROR: " + e);
        return;
    }

    if(('sws' in req) && ('track' in req.sws) && !req.sws.track ){
        // Tracking disabled for this request
        return;
    }

    // Setup handler for finishing reponse
    res.on('finish',function(){
        handleResponseFinished(this);
    });
}

// Response finish hanlder
function handleResponseFinished(res){
    try {
        swsProcessor.processResponse(res);
    }catch(e){
        debug("SWS:processResponse:ERROR: " + e);
    }
}

// Process /swagger-stats/stats request
// Return statistics according to request parameters
// Query parameters (fields, path, method) defines which stat fields to return
function processGetStats(req,res){

    swsAuth.processAuth(req,res).then((authResult) => {
        if(!authResult){
            return;
        }
        res.statusCode = 200;
        if(('sws-auth' in req) && req['sws-auth']){
            res.setHeader('x-sws-authenticated','true');
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(swsProcessor.getStats(req.sws.query)));
    });
}


// Process /swagger-stats/metrics request
// Return all metrics for Prometheus
function processGetMetrics(req,res){

    swsAuth.processAuth(req,res).then((authResult) => {
        if(!authResult){
            return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        // [sv2] This should handle both non-promise (prom-client 11,12) and promise results (prom-client 13+)
        Promise.resolve(promClient.register.metrics()).then( (x) => {
            res.end(x);
        });
    });
}

// Process /swagger-stats/ux request
function processGetUX(req,res){
    // alwauys serve ux, it will perform auth as needed
    let fileName = null;
    if(req.url === swsSettings.pathUX){
        fileName = 'index.html';
    } else {
        fileName = req.url.replace(swsSettings.pathUX, '');
        let qidx = fileName.indexOf('?');
        if ( qidx != -1 ) {
            fileName = fileName.substring(0, qidx);
        }
    }
    let options = {
        root: path.join(__dirname,'..','ux'),
        dotfiles: 'deny'
        // TODO Caching
    };
    res.setHeader('Content-Type', send.mime.lookup(path.basename(fileName)));
    send(req, fileName, options).pipe(res);
}

// Express Middleware
function expressMiddleware(options) {

    // Init settings
    swsSettings.init(options);

    // Init probes
    swsEgress.init();

    /*
    if( swsSettings.authentication ){
        setInterval(expireSessionIDs,500);
    }
    */

    swsProcessor.init();

    return function trackingMiddleware(req, res, next) {

        res._swsReq = req;
        req.sws = {};
        req.sws.query = qs.parse(url.parse(req.url).query);

        // Respond to requests handled by swagger-stats
        // swagger-stats requests will not be counted in statistics
        if(req.url === swsSettings.uriPath ){
            if(('serverName' in req) && (req.serverName === 'restify') ){
                res.redirect(swsSettings.uriPath + '/', next);
            } else {
                res.redirect(swsSettings.uriPath + '/');
            }
            return;
        }
        else if(req.url.startsWith(swsSettings.pathStats)) {
            return processGetStats(req, res);
        }else if(req.url.startsWith(swsSettings.pathMetrics)){
            return processGetMetrics(req,res);
        }else if(req.url.startsWith(swsSettings.pathLogout)){
            swsAuth.processLogout(req,res);
            return;
        } else if(req.url.startsWith(swsSettings.pathUX)) {
            return processGetUX(req, res);
        }

        handleRequest(req, res);

        return next();
    };
}

function fastifyPlugin (fastify, opts, done) {
    fastify.decorate('utility', () => {})
    fastify.use(expressMiddleware(opts));
    /*
    fastify.addHook('onRequest', (request, reply, done) => {
        const self = this;
        console.log(`Got onRequest`);
        done()
    });
     */
    fastify.addHook('onResponse', (request, reply, done) => {
        // pre-process request, response, context before response handled by sws
        // Capture Fastify-specific data
        request.raw.sws = request.raw.sws || {};
        // TODO Headers
        //let h = Object.getOwnPropertySymbols(reply);
        //let hh = reply[headersSymbol];
        // Set route_path as reply.context.config.url
        if(('context' in reply) && ('config' in reply.context) && ('url' in reply.context.config)){
            request.raw.sws.route_path = reply.context.config.url;
        }
        done()
    });
    done();
}
fastifyPlugin[Symbol.for('skip-override')] = true;

module.exports = {

    // Returns Hapi plugin
    getHapiPlugin: {
        name: 'swagger-stats',
        version: '0.97.9',
        register: async function (server, options) {

            // Init settings
            swsSettings.init(options);

            // Init probes TODO Reconsider
            swsEgress.init();

            swsProcessor.init();

            return swsHapi.register(server, options);
        }
    },

    getFastifyPlugin: fastifyPlugin,

    // Initialize swagger-stats and return
    // middleware to perform API Data collection
    getMiddleware: expressMiddleware,

    // TODO Support specifying which stat fields to return
    // Returns object with collected statistics
    getCoreStats: function() {
        return swsProcessor.getStats();
    },

    // Allow get stats as prometheus format
    getPromStats: function() {
        return promClient.register.metrics();
    },

    // Expose promClient to allow for custom metrics by application
    getPromClient: function () {
        return promClient;
    },

    // Stop the processor so that Node.js can exit
    stop: function () {
        return swsProcessor.stop();
    }
};
