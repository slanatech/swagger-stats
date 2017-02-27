/**
 * Created by sv2 on 2/16/17.
 */

// TODO Handle "finish" even on response - to track time, results, etc
// TODO Validate requests per swagger definition. Enable validation only for specific subset of URIs, i.e. "/api"


'use strict';

// TODO Cuid ???
var log4js = require('log4js');
var logger = log4js.getLogger('swagger-stats')
var swsAPIStats = require('./swsApistats');

module.exports = function(options) {

    // TODO support options - swagger file, frequency, etc
    var op = options && options.op;

    // API Statistics collection
    var apiStats = new swsAPIStats();

    // Request hanlder
    function handleRequest(req, res){

        logger.info("TRACKING: " + req.url);

        try {
            apiStats.countRequest(req,res);
        }catch(e){
            // NOOP TODO Debug
        }

        // Setup handler for finishing reponse
        res.on('finish',function(){
            handleResponseFinished(this);
        });
    }

    // Response finish hanlder
    function handleResponseFinished(res){
        logger.info("TRACKING: res - finish: " + res.req.url);
        try {
            apiStats.countResponse(res);
        }catch(e){
            // NOOP TODO Debug
        }
    }

    return function trackingMiddleware(req, res, next) {

        handleRequest(req, res);

        // Respond to our own requests.
        // They will be counted in statistics as well
        if(req.url.startsWith('/api-stats')){
            res.status(200).json(apiStats);
            return;
        }

        return next();
    };

};
