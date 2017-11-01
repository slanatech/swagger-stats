/**
 * Created by sv2 on 2/16/17.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var debug = require('debug')('sws:interface');
var promClient = require("prom-client");
var basicAuth = require("basic-auth");

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
    apdexThreshold: 50,
    onResponseFinish: null,
    authentication: false,
    onAuthenticate: function(req,username,password) {return false;}
};

var uiMarkup = swsUtil.swsEmbeddedUIMarkup;

var pathUI = swsOptions.uriPath+'/ui';
var pathDist = swsOptions.uriPath+'/dist';
var pathStats = swsOptions.uriPath+'/stats';
var pathMetrics = swsOptions.uriPath+'/metrics';

// Request hanlder
function handleRequest(req, res){
    try {
        processor.processRequest(req,res);
    }catch(e){
        debug("SWS:processRequest:ERROR: " + e);
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
}


function processAuth(req,res,useWWWAuth) {

    if( !swsOptions.authentication ){
        return true;
    }

    var authInfo = basicAuth(req);

    var authenticated = false;

    if( (authInfo !== undefined) && (authInfo!==null) && ('name' in authInfo) && ('pass' in authInfo)){
        if(typeof swsOptions.onAuthenticate === 'function'){
            if( swsOptions.onAuthenticate(req, authInfo.name, authInfo.pass) ){
                authenticated = true;
            }
        }
    }

    if( !authenticated ){
        if(useWWWAuth){
            res.setHeader('WWW-Authenticate', 'Basic realm="swagger-stats"');
        }
        // TODO Reconsider 401 response. Should it be 403 or 500, to prevent browser Basic Auth pop-up in UI ?
        res.status(401).end('Access denied');
        return false;
    }

    return true;
}


// Process /swagger-stats/stats request
// Return statistics according to request parameters
// Query parameters (fields, path, method) defines which stat fields to return
function processGetStats(req,res){

    if(!processAuth(req,res,true)) {
        return;
    }

    res.status(200).json( processor.getStats( req.query ) );
}


// Process /swagger-stats/metrics request
// Return all metrics for Prometheus
function processGetMetrics(req,res){

    if(!processAuth(req,res,false)) {
        return;
    }

    res.status(200).set('Content-Type', 'text/plain');
    res.end(promClient.register.metrics());
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
                processGetStats(req, res);
                return;
            }else if(req.url.startsWith(pathMetrics)){
                processGetMetrics(req,res);
                return;
            }else if(req.url == pathUI ){
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
