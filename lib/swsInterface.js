/**
 * Created by sv2 on 2/16/17.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');
const debug = require('debug')('sws:interface');
const promClient = require("prom-client");
const basicAuth = require("basic-auth");
const Cookies = require('cookies');
const uuidv1 = require('uuid/v1');

const swsSettings = require('./swssettings');
const swsUtil = require('./swsUtil');
const swsProcessor = require('./swsProcessor');
const swsEgress = require('./swsegress');
const send = require('send');
const qs = require('qs');

const swsHapi = require('./swsHapi');

// API data processor
//var processor = null;

var uiMarkup = swsUtil.swsEmbeddedUIMarkup;

// Session IDs storage
var sessionIDs = {};

// Store / update session id
function storeSessionID(sid){
    var tssec = Date.now() + swsSettings.sessionMaxAge*1000;
    sessionIDs[sid] = tssec;
    //debug('Session ID updated: %s=%d', sid,tssec);
}

// Remove Session ID
function removeSessionID(sid){
    delete sessionIDs[sid];
}

// If authentication is enabled, executed periodically and expires old session IDs
function expireSessionIDs(){
    var tssec = Date.now();
    var expired = [];
    for(var sid in sessionIDs){
        if(sessionIDs[sid] < (tssec + 500)){
            expired.push(sid);
        }
    }
    for(var i=0;i<expired.length;i++){
        delete sessionIDs[expired[i]];
        debug('Session ID expired: %s', expired[i]);
    }
}

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

function processAuth(req,res,useWWWAuth) {

    return new Promise( function (resolve, reject) {
        if( !swsSettings.authentication ){
            return resolve(true);
        }

        var cookies = new Cookies( req, res );

        // Check session cookie
        var sessionIdCookie = cookies.get('sws-session-id');
        if( (sessionIdCookie !== undefined) && (sessionIdCookie !== null) ){

            if( sessionIdCookie in sessionIDs ){
                // renew it
                //sessionIDs[sessionIdCookie] = Date.now();
                storeSessionID(sessionIdCookie);
                cookies.set('sws-session-id',sessionIdCookie,{path:swsSettings.uriPath,maxAge:swsSettings.sessionMaxAge*1000});
                // Ok
                req['sws-auth'] = true;
                return resolve(true);
            }
        }

        var authInfo = basicAuth(req);

        var authenticated = false;
        var msg = 'Authentication required';

        if( (authInfo !== undefined) && (authInfo!==null) && ('name' in authInfo) && ('pass' in authInfo)){
            if(typeof swsSettings.onAuthenticate === 'function'){

                Promise.resolve(swsSettings.onAuthenticate(req, authInfo.name, authInfo.pass)).then(function(onAuthResult) {
                    if( onAuthResult ){

                        authenticated = true;

                        // Session is only for stats requests
                        if(req.url.startsWith(swsSettings.pathStats)){
                            // Generate session id
                            var sessid = uuidv1();
                            storeSessionID(sessid);
                            // Set session cookie with expiration in 15 min
                            cookies.set('sws-session-id',sessid,{path:swsSettings.uriPath,maxAge:swsSettings.sessionMaxAge*1000});
                        }

                        req['sws-auth'] = true;
                        return resolve(true);

                    }else{
                        msg = 'Invalid credentials';
                        res.statusCode = 403;
                        res.end(msg);
                        return resolve(false);
                    }
                });

            }else{
                res.statusCode = 403;
                res.end(msg);
                return resolve(false);
            }
        }else{
            res.statusCode = 403;
            res.end(msg);
            return resolve(false);
        }

    });

}

function processLogout(req,res){

    var cookies = new Cookies( req, res );

    // Check session cookie
    var sessionIdCookie = cookies.get('sws-session-id');
    if( (sessionIdCookie !== undefined) && (sessionIdCookie !== null) ){
        if( sessionIdCookie in sessionIDs ){
            removeSessionID(sessionIdCookie);
            cookies.set('sws-session-id'); // deletes cookie
        }
    }

    res.statusCode = 200;
    res.end('Logged out');
}


// Process /swagger-stats/stats request
// Return statistics according to request parameters
// Query parameters (fields, path, method) defines which stat fields to return
function processGetStats(req,res){

    processAuth(req,res).then(function (authResult){
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

    processAuth(req,res).then(function (authResult){
        if(!authResult){
            return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(promClient.register.metrics());
    });
}

// Express Middleware
function expressMiddleware(options) {

    // Init settings
    swsSettings.init(options);

    // Init probes
    swsEgress.init();

    if( swsSettings.authentication ){
        setInterval(expireSessionIDs,500);
    }

    swsProcessor.init();

    return function trackingMiddleware(req, res, next) {

        res._swsReq = req;
        req.sws = {};
        req.sws.query = qs.parse(url.parse(req.url).query);

        // Respond to requests handled by swagger-stats
        // swagger-stats requests will not be counted in statistics
        if(req.url.startsWith(swsSettings.pathStats)) {
            return processGetStats(req, res);
        }else if(req.url.startsWith(swsSettings.pathMetrics)){
            return processGetMetrics(req,res);
        }else if(req.url.startsWith(swsSettings.pathLogout)){
            processLogout(req,res);
            return;
        }else if(req.url.startsWith(swsSettings.pathUI) ){
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(uiMarkup);
            return;
        }else if(req.url.startsWith(swsSettings.pathDist)) {
            var fileName = req.url.replace(swsSettings.pathDist+'/','');
            var qidx = fileName.indexOf('?');
            if(qidx!=-1) fileName = fileName.substring(0,qidx);

            var options = {
                root: path.join(__dirname,'..','dist'),
                dotfiles: 'deny'
                // TODO Caching
            };
            res.setHeader('Content-Type', send.mime.lookup(path.basename(fileName)));
            send(req, fileName, options).pipe(res);
            return;
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
