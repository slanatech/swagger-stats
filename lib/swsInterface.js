/**
 * Created by sv2 on 2/16/17.
 */

// TODO Validate requests per swagger definition. Enable validation only for specific subset of URIs, i.e. "/api"

'use strict';

// TODO Remove log4js
var log4js = require('log4js');
var logger = log4js.getLogger('swagger-stats')

var swsUtil = require('./swsUtil');
var swsProcessor = require('./swsProcessor');

// API data processor
var processor = null;

// swagger-stats default options
var swsOptions = {
    swaggerSpec: null
};

// Request hanlder
function handleRequest(req, res){
    try {
        processor.processRequest(req,res);
    }catch(e){
        logger.error("ERROR: " + e);
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
        logger.error("ERROR: " + e);
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
}

// Process /swagger-stats/stats request
// Return statistics according to request parameters
// Query parameters (fields, path, method) defines which stat fields to return
function processGetStats(req,res){
    res.status(200).json( processor.getStats( req.query ) );
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
            if(req.url.startsWith('/swagger-stats/stats')){
                processGetStats(req,res);
                return;
            }else if(req.url =='/swagger-stats/ui'){
                // TODO Show UI
                return;
            }

            handleRequest(req, res);

            return next();
        };
    },

    // Returns object with collected statistics
    getCoreStats: function() {
        return processor.getCoreStats();
    }

};
