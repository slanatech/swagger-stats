/**
 * Created by sv2 on 2/16/17.
 */

// TODO Handle "finish" even on response - to track time, results, etc
// TODO Validate requests per swagger definition. Enable validation only for specific subset of URIs, i.e. "/api"


'use strict';

// TODO Cuid ???
var log4js = require('log4js');
var logger = log4js.getLogger('swagger-stats')
var swsAPIData = require('./swsAPIData');

module.exports = function(options) {

    // TODO support options - swagger file, frequency, etc
    var op = options && options.op;

    // API Data collection
    var apiData = new swsAPIData();

    // Request hanlder
    function handleRequest(req, res){

        logger.info("TRACKING: " + req.url);

        try {
            apiData.processRequest(req,res);
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
        logger.info("TRACKING: res - finish: " + res.req.url);
        try {
            apiData.processResponse(res);
        }catch(e){
            logger.error("ERROR: " + e);
        }
    }

    return function trackingMiddleware(req, res, next) {

        handleRequest(req, res);

        // Respond to our own requests.
        // They will be counted in statistics as well
        if(req.url == '/api-stats/data.json'){
            res.status(200).json(apiData);
            return;
        }else if(req.url =='/api-stats'){
            // TODO Show UI
            return;
        }

        return next();
    };

};
