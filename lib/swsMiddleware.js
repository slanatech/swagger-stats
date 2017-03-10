/**
 * Created by sv2 on 2/16/17.
 */

// TODO Validate requests per swagger definition. Enable validation only for specific subset of URIs, i.e. "/api"

'use strict';

// TODO Remove log4js
var log4js = require('log4js');
var logger = log4js.getLogger('swagger-stats')

var swsAPIData = require('./swsAPIData');

var apiData = null;

//module.exports = function(options) {

// Request hanlder
function handleRequest(req, res){
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
    try {
        apiData.processResponse(res);
    }catch(e){
        logger.error("ERROR: " + e);
    }
}


module.exports = {

    init: function (options) {

        // TODO support options - swagger file, frequency, etc
        var op = options && options.op;

        apiData = new swsAPIData();
        apiData.init();
    },

    // Middleware to perform API Data collection
    getMiddleware: function () {

        // TODO Consider initializing here

        return function trackingMiddleware(req, res, next) {

            // Respond to requests handled by swagger-stats
            // swagger-stats requests will not be counted in statistics
            if(req.url == '/swagger-stats/data'){
                // TODO Support parameters to get detailed statistics about individual APIs
                res.status(200).json(apiData);
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
    getData: function() {
        return apiData;
    }

};
