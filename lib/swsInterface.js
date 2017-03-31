/**
 * Created by sv2 on 2/16/17.
 */

// TODO Validate requests per swagger definition. Enable validation only for specific subset of URIs, i.e. "/api"

'use strict';

// TODO Remove log4js
var log4js = require('log4js');
var logger = log4js.getLogger('swagger-stats')

var swsProcessor = require('./swsProcessor');

// API data
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

    if('swaggerSpec' in options){
        swsOptions.swaggerSpec = options.swaggerSpec;
    }
}

module.exports = {

    // Initialize swagger-stats
    init: function (options) {

        processOptions(options);

        processor = new swsProcessor();
        processor.init(swsOptions);
    },

    // Middleware to perform API Data collection
    getMiddleware: function () {

        return function trackingMiddleware(req, res, next) {

            // TODO Support parameters to get detailed statistics about individual APIs

            // Respond to requests handled by swagger-stats
            // swagger-stats requests will not be counted in statistics
            if(req.url == '/swagger-stats/data') {
                res.status(200).json(processor.getCoreStats());
                return;
            }else if(req.url == '/swagger-stats/data/lasterrors'){
                    res.status(200).json(processor.getLastErrors());
                    return;
            }else if(req.url == '/swagger-stats/data/longestreq'){
                res.status(200).json(processor.getLongestReq());
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
