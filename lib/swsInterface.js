/**
 * Created by sv2 on 2/16/17.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var debug = require('debug')('sws:interface');
var promClient = require("prom-client");
var basicAuth = require("basic-auth");
var Cookies = require('cookies');
const uuidv1 = require('uuid/v1');

var swsUtil = require('./swsUtil');
var swsProcessor = require('./swsProcessor');

// API data processor
var processor = null;

// swagger-stats default options
var swsOptions = {
    version:'',
    swaggerSpec: null,
    uriPath: '/swagger-stats',
    durationBuckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    requestSizeBuckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    responseSizeBuckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    apdexThreshold: 25,
    onResponseFinish: null,
    authentication: false,
    sessionMaxAge: 900,
    onAuthenticate: null
};

var uiMarkup = swsUtil.swsEmbeddedUIMarkup;

var pathUI = swsOptions.uriPath+'/ui';
var pathDist = swsOptions.uriPath+'/dist';
var pathStats = swsOptions.uriPath+'/stats';
var pathMetrics = swsOptions.uriPath+'/metrics';
var pathLogout = swsOptions.uriPath+'/logout';

// Session IDs storage
var sessionIDs = {};

// Store / update session id
function storeSessionID(sid){
    var tssec = Date.now() + swsOptions.sessionMaxAge*1000;
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
        processor.processRequest(req,res);
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
        processor.processResponse(res);
    }catch(e){
        debug("SWS:processResponse:ERROR: " + e);
    }
}

// Override defaults if options are provided
function processOptions(options){
    if(!options) return;

    for(var op in swsUtil.supportedOptions){
        if(op in options){
            swsOptions[op] = options[op];
        }
    }

    // update standard path
    pathUI = swsOptions.uriPath+'/ui';
    pathDist = swsOptions.uriPath+'/dist';
    pathStats = swsOptions.uriPath+'/stats';
    pathMetrics = swsOptions.uriPath+'/metrics';
    pathLogout = swsOptions.uriPath+'/logout';

    if( swsOptions.authentication ){
        setInterval(expireSessionIDs,500);
    }
}


function processAuth(req,res,useWWWAuth) {

    return new Promise( function (resolve, reject) {
        if( !swsOptions.authentication ){
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
                cookies.set('sws-session-id',sessionIdCookie,{path:swsOptions.uriPath,maxAge:swsOptions.sessionMaxAge*1000});
                // Ok
                req['sws-auth'] = true;
                return resolve(true);
            }
        }

        var authInfo = basicAuth(req);

        var authenticated = false;
        var msg = 'Authentication required';

        if( (authInfo !== undefined) && (authInfo!==null) && ('name' in authInfo) && ('pass' in authInfo)){
            if(typeof swsOptions.onAuthenticate === 'function'){

                Promise.resolve(swsOptions.onAuthenticate(req, authInfo.name, authInfo.pass)).then(function(onAuthResult) {
                    if( onAuthResult ){

                        authenticated = true;

                        // Session is only for stats requests
                        if(req.url.startsWith(pathStats)){
                            // Generate session id
                            var sessid = uuidv1();
                            storeSessionID(sessid);
                            // Set session cookie with expiration in 15 min
                            cookies.set('sws-session-id',sessid,{path:swsOptions.uriPath,maxAge:swsOptions.sessionMaxAge*1000});
                        }

                        req['sws-auth'] = true;
                        return resolve(true);

                    }else{
                        msg = 'Invalid credentials';
                        res.status(403).end(msg);
                        return resolve(false);
                    }
                });

            }else{
                res.status(403).end(msg);
                return resolve(false);
            }
        }else{
            res.status(403).end(msg);
            return resolve(false);
        }

    });

/*
    if( !swsOptions.authentication ){
        return true;
    }

    var cookies = new Cookies( req, res );

    // Check session cookie
    var sessionIdCookie = cookies.get('sws-session-id');
    if( (sessionIdCookie !== undefined) && (sessionIdCookie !== null) ){

        if( sessionIdCookie in sessionIDs ){
            // renew it
            //sessionIDs[sessionIdCookie] = Date.now();
            storeSessionID(sessionIdCookie);
            cookies.set('sws-session-id',sessionIdCookie,{path:swsOptions.uriPath,maxAge:swsOptions.sessionMaxAge*1000});
            // Ok
            req['sws-auth'] = true;
            return true;
        }
    }

    var authInfo = basicAuth(req);

    var authenticated = false;
    var msg = 'Authentication required';

    if( (authInfo !== undefined) && (authInfo!==null) && ('name' in authInfo) && ('pass' in authInfo)){
        if(typeof swsOptions.onAuthenticate === 'function'){
            if( swsOptions.onAuthenticate(req, authInfo.name, authInfo.pass) ){

                authenticated = true;

                // Session is only for stats requests
                if(req.url.startsWith(pathStats)){
                    // Generate session id
                    var sessid = uuidv1();
                    storeSessionID(sessid);
                    // Set session cookie with expiration in 15 min
                    cookies.set('sws-session-id',sessid,{path:swsOptions.uriPath,maxAge:swsOptions.sessionMaxAge*1000});
                }


            }else{
                msg = 'Invalid credentials';
            }
        }
    }

    if( !authenticated ){
        // Reconsidered 401 response. Make it be 403 to prevent browser Basic Auth pop-up in UI
        res.status(403).end(msg);
        return false;
    }

    req['sws-auth'] = true;
    return true;
*/
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

    res.status(200).end('Logged out');
}


// Process /swagger-stats/stats request
// Return statistics according to request parameters
// Query parameters (fields, path, method) defines which stat fields to return
function processGetStats(req,res){

    processAuth(req,res).then(function (authResult){
        if(!authResult){
            return;
        }
        res.status(200);
        if(('sws-auth' in req) && req['sws-auth']){
            res.setHeader('x-sws-authenticated','true');
        }
        res.json( processor.getStats( req.query ) );
    });

    /*
    if(!processAuth(req,res)) {
        return;
    }

    if(('sws-auth' in req) && req['sws-auth']){
        res.setHeader('x-sws-authenticated','true');
    }

    res.status(200).json( processor.getStats( req.query ) );
    */
}


// Process /swagger-stats/metrics request
// Return all metrics for Prometheus
function processGetMetrics(req,res){

    processAuth(req,res).then(function (authResult){
        if(!authResult){
            return;
        }
        res.status(200).set('Content-Type', 'text/plain');
        res.end(promClient.register.metrics());
    });

    /*
    if(!processAuth(req,res)) {
        return;
    }

    res.status(200).set('Content-Type', 'text/plain');
    res.end(promClient.register.metrics());
    */
}

module.exports = {

    // Initialize swagger-stats and return
    // middleware to perform API Data collection
    getMiddleware: function (options) {

        processOptions(options);

        processor = new swsProcessor();
        processor.init(swsOptions);

        return function trackingMiddleware(req, res, next) {

            // Respond to requests handled by swagger-stats
            // swagger-stats requests will not be counted in statistics
            if(req.url.startsWith(pathStats)) {
                return processGetStats(req, res);
            }else if(req.url.startsWith(pathMetrics)){
                return processGetMetrics(req,res);
            }else if(req.url.startsWith(pathLogout)){
                processLogout(req,res);
                return;
            }else if(req.url.startsWith(pathUI) ){
                res.status(200).send(uiMarkup);
                return;
            }else if(req.url.startsWith(pathDist)) {
                var fileName = req.url.replace(pathDist+'/','');
                var qidx = fileName.indexOf('?');
                if(qidx!=-1) fileName = fileName.substring(0,qidx);

                var options = {
                    root: path.join(__dirname,'..','dist'),
                    dotfiles: 'deny'
                    // TODO Caching
                };
                res.sendFile(fileName, options, function (err) {
                    if (err) {
                        debug('unable to send file: %s',fileName);
                    }
                });
                return;
            }

            handleRequest(req, res);

            return next();
        };
    },

    // TODO Support specifying which stat fields to return
    // Returns object with collected statistics
    getCoreStats: function() {
        return processor.getStats();
    }
};
