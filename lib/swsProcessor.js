/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

// TODO Process res.statusMessage
// TODO Keep a list of most recent errors
// TODO Keep a list of most frequent errors

'use strict';

var util = require('util');

var swsUtil = require('./swsUtil');
var swsReqResStats = require('./swsReqResStats');
var swsCoreStats = require('./swsCoreStats');

// Constructor
function swsProcessor() {

    // Core statistics
    this.coreStats = new swsCoreStats();

    // TODO API-specific detailed statistics

    // API matching indexes - maps route path to swagger api path
    // Format: { route_path: api_path }
    this.apiPathIndex = {};

}

// Initialize
swsProcessor.prototype.init = function (swsOptions) {
    this.initializeAPI(swsOptions);
    this.coreStats.init();
    setInterval(this.tick, 100, this);
};

// Returns Core statistics
swsProcessor.prototype.getCoreStats = function () {
    return this.coreStats;
};

// Tick - called with specified interval to refresh timelines
swsProcessor.prototype.tick = function (that) {
    that.coreStats.updateTimeline();
    // TODO Update timelines in API stats
};

// Initialize API stats based on swagger definition
// TODO Store data about API in a structure that will be easy to match when counting requests
// TODO convert {param} to :param, so we can match directly with route.path
swsProcessor.prototype.initializeAPI = function (swsOptions) {

    if(!swsOptions) return;
    if(!swsOptions.swaggerSpec) return;
    if(!swsOptions.swaggerSpec.paths) return;

    // Enumerate all paths entries
    for(var path in swsOptions.swaggerSpec.paths ){
        console.log(path);
        var pathDef = swsOptions.swaggerSpec.paths[path];

        // Convert swagger path to express route_path
        // /tester/{code} -> /tester/:code
        var route_path = path.replace('{',':');
        route_path = route_path.replace('}','');
        this.apiPathIndex[route_path] = path;

        var operations = ['get','put','post','delete','options','head','patch'];
        for(var i=0;i<operations.length;i++){
            var op = operations[i];
            if(op in pathDef){
                console.log('   ' + op);
                var opDef = pathDef[op];
                var opMethod = op.toUpperCase();
                var apiEntry = {};
                if( 'deprecated' in opDef ) apiEntry.deprecated = opDef.deprecated;
                if( 'description' in opDef ) apiEntry.description = opDef.description;
                if( 'operationId' in opDef ) apiEntry.operationId = opDef.operationId;
                // TODO Is it needed to store the same route_path in each path:op ?
                //apiEntry.route_path = route_path;
                apiEntry.stats = new swsReqResStats();
                if( 'summary' in opDef ) apiEntry.summary = opDef.summary;
                apiEntry.swagger = true;
                if( 'tags' in opDef ) apiEntry.tags = opDef.tags;

                // Add addApiEntry to Core Stats definitions
                this.coreStats.addAPIEntry(path,opMethod,apiEntry);
            }
        }
    }

};

// Collect all data for request/response pair
swsProcessor.prototype.collectRequestResponseData = function (res) {

    var req = res.req;

    var codeclass = swsUtil.getStatusCodeClass(res.statusCode);

    var reqresdata = {
        'url': req.url,
        'originalUrl': req.originalUrl,
        'method': req.method,
        'startts': 0,
        'endts': 0,
        'duration': 0,
        'codeclass': codeclass,
        'code': res.statusCode,
        'message': res.statusMessage
    };

    // Request Headers
    if ("headers" in req) {
        reqresdata.req_headers = {};
        for(var hdr in req.headers){
            reqresdata.req_headers[hdr] = req.headers[hdr];
        }
    }

    // Response Headers
    if ("_headers" in res){
        reqresdata.res_headers = {};
        for(var hdr in res['_headers']){
            reqresdata.res_headers[hdr] = res['_headers'][hdr];
        }
    }

    // Additional details from collected info per request / response pair
    if ("swaggerstats" in req) {

        reqresdata.startts = req.swaggerstats.startts;
        reqresdata.endts = req.swaggerstats.endts;
        reqresdata.duration = req.swaggerstats.duration;
        reqresdata.req_clength = req.swaggerstats.req_clength;
        reqresdata.res_clength = req.swaggerstats.res_clength;
        reqresdata.route_path = req.swaggerstats.route_path;


        // TODO
        // Add detailed swagger API info
        reqresdata.api = {};
        if( req.swaggerstats.api_path != ''){
            reqresdata.api.path = req.swaggerstats.api_path;
        }else{
            // If this is call to API not defined in swagger spec, fall back to route_path
            reqresdata.api.path = req.swaggerstats.route_path;
        }

        // TODO
        // reqresdata.api.swagger = true;


        // TODO Get additional attributes from coreStats (if any)
    }


    // TODO Body (?)
    // TODO Parameters
    // TODO Source IP address

    return reqresdata;
};

swsProcessor.prototype.processRequest = function (req, res) {

    // Placeholder for sws-specific attributes
    req.swaggerstats = {};

    // Count it in all stat collectors
    this.coreStats.countRequest(req, res);
};

swsProcessor.prototype.processResponse = function (res) {

    var req = res.req;

    // Determine route path for the request
    var route_path = '';
    if (("route" in req) && ("path" in req.route)) {
        route_path = req.route.path;
    }
    req.swaggerstats.route_path = route_path;

    // Try to find matching API path from swagger definitions
    // Store matched API path, if not found - will be empty
    var api_path = '';
    if(route_path in this.apiPathIndex){
        api_path = this.apiPathIndex[route_path];
    }
    req.swaggerstats.api_path = api_path;

    this.coreStats.countResponse(res);

    // Collect data about request / response
    var reqresdata = this.collectRequestResponseData(res);

    if(swsUtil.isError(res.statusCode)){
        this.coreStats.addError(reqresdata);
    }

    // TODO Push Request/Response Data to Emitter(s)
};


module.exports = swsProcessor;
