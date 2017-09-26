/**
 * Created by sv2 on 2/16/17.
 */

// TODO Validate requests per swagger definition. Enable validation only for specific subset of URIs, i.e. "/api"

'use strict';

var fs = require('fs');
var path = require('path');
var debug = require('debug')('sws:interface');

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
    responseSizeBuckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
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

// Process /swagger-stats/stats request
// Return statistics according to request parameters
// Query parameters (fields, path, method) defines which stat fields to return
function processGetStats(req,res){
    res.status(200).json( processor.getStats( req.query ) );
}


// Process /swagger-stats/metrics request
// Return all metrics for Prometheus
function processGetMetrics(req,res){

    //res.status(200)
    //    .set('Content-Type', 'text/plain')
    //    .send( processor.getMetrics( req.query ) );
    res.status(200).set('Content-Type', 'text/plain');

    if(req.query.test) {
        var dummyStream = {
            write: function (text) {
            }
        };
        res.write('testing\n');

        debug('Start Test');
        var startts = new Date();

        for (var i = 0; i < 10000; i++) {
            processor.writeMetrics(req.query, dummyStream);
        }

        var endts = new Date();
        debug('End Test: ' + (endts - startts));
        res.write('done: '+(endts - startts) + ' ms\n');
    }else{
        processor.writeMetrics(req.query, res);
    }

    res.end();
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
