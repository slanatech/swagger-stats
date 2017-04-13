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
var pathToRegexp = require('path-to-regexp');
var swsReqResStats = require('./swsReqResStats');
var swsCoreStats = require('./swsCoreStats');
var swsTimeline = require('./swsTimeline');
var swsAPIStats = require('./swsAPIStats');
var swsLastErrors = require('./swsLastErrors');
var swsLongestRequests = require('./swsLongestReq');

// Constructor
function swsProcessor() {

    // Core statistics
    this.coreStats = new swsCoreStats();

    // Timeline
    this.timeline = new swsTimeline();

    // API Stats
    this.apiStats = new swsAPIStats();

    // Last Errors
    this.lastErrors = new swsLastErrors();

    // Longest Requests
    this.longestRequests = new swsLongestRequests();

    // TODO Remove
    this.basePath = '/';

    // TODO Remove
    this.apiMatchIndex = {};
}

// Initialize
swsProcessor.prototype.init = function (swsOptions) {

    this.coreStats.initialize(swsOptions);

    this.timeline.initialize(swsOptions);

    // TODO Temp - remove
    this.initializeAPI(swsOptions);

    this.apiStats.initialize(swsOptions);

    // Start tick
    setInterval(this.tick, 500, this);
};

// TODO remove
swsProcessor.prototype.getCoreStats = function () {
    return this.coreStats;
};

// TODO remove
swsProcessor.prototype.getLastErrors = function () {
    return this.lastErrors;
};

// TODO remove
swsProcessor.prototype.getLongestReq = function () {
    return this.longestRequests.getData();
};

// Tick - called with specified interval to refresh timelines
swsProcessor.prototype.tick = function (that) {

    var ts = Date.now();
    var totalElapsedSec = (ts - that.coreStats.startts)/1000;

    that.coreStats.tick(ts,totalElapsedSec);

    that.timeline.tick(ts,totalElapsedSec);

    that.apiStats.tick(ts,totalElapsedSec);

};

// TODO Remove
swsProcessor.prototype.initBasePath = function(swaggerSpec) {
    this.basePath = swaggerSpec.basePath ? swaggerSpec.basePath : '/';
    if (this.basePath.charAt(0) !== '/') {
        this.basePath = '/' + this.basePath;
    }
    if (this.basePath.charAt(this.basePath.length - 1) !== '/') {
        this.basePath = this.basePath + '/';
    }
};

// TODO Remove
swsProcessor.prototype.getFullPath = function (path) {
    var fullPath = this.basePath;
    if (path.charAt(0) === '/') {
        fullPath += path.substring(1);
    }else{
        fullPath += path;
    }
    return fullPath;
};

// TODO Remove
swsProcessor.prototype.initializeAPI = function (swsOptions) {

    if(!swsOptions) return;
    if(!swsOptions.swaggerSpec) return;

    this.initBasePath(swsOptions.swaggerSpec);

    if(!swsOptions.swaggerSpec.paths) return;


    // Enumerate all paths entries
    for(var path in swsOptions.swaggerSpec.paths ){

        console.log(path);
        var pathDef = swsOptions.swaggerSpec.paths[path];

        // Create full path
        var fullPath = this.getFullPath(path);

        // Convert to express path
        var fullExpressPath = fullPath.replace('{',':');
        fullExpressPath = fullExpressPath.replace('}','');

        // Create regex for matching this API path
        var keys = [];
        var re = pathToRegexp(fullExpressPath, keys);

        // Add to API Match Index, leveraging express style matching
        this.apiMatchIndex[fullPath] = { re: re, keys: keys, expressPath: fullExpressPath, methods: {}};
        console.log('   Added:' + fullPath + ' => ' + fullExpressPath );

        var operations = ['get','put','post','delete','options','head','patch'];
        for(var i=0;i<operations.length;i++){
            var op = operations[i];
            if(op in pathDef){
                console.log('   ' + op);
                var opDef = pathDef[op];
                var opMethod = op.toUpperCase();

                var apiInfo = {};       // Short API info for matching index
                var apiEntry = {};      // API Entry for statistics

                var depr = ('deprecated' in opDef) ? opDef.deprecated : false;
                apiEntry.deprecated = depr;
                apiInfo.deprecated = depr;

                if( 'description' in opDef ) apiEntry.description = opDef.description;
                if( 'operationId' in opDef ) {
                    apiEntry.operationId = opDef.operationId;
                    apiInfo.operationId = opDef.operationId;
                }

                apiEntry.stats = new swsReqResStats();

                if( 'summary' in opDef ) apiEntry.summary = opDef.summary;

                apiEntry.swagger = true;

                if( 'tags' in opDef ) {
                    apiEntry.tags = opDef.tags;
                    apiInfo.tags = opDef.tags;
                }

                // Store in match index
                this.apiMatchIndex[fullPath].methods[opMethod] = apiInfo;

                // Add addApiEntry to Core Stats definitions
                this.coreStats.addAPIEntry(fullPath,opMethod,apiEntry);
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
    if ("sws" in req) {

        reqresdata.startts = req.sws.startts;
        reqresdata.endts = req.sws.endts;
        reqresdata.duration = req.sws.duration;
        reqresdata.req_clength = req.sws.req_clength;
        reqresdata.res_clength = req.sws.res_clength;
        reqresdata.route_path = req.sws.route_path;

        // Add detailed swagger API info
        reqresdata.api = {};
        reqresdata.api.path = req.sws.api_path;
        if( 'swagger' in req.sws ) reqresdata.api.swagger = req.sws.swagger;
        if( 'deprecated' in req.sws ) reqresdata.api.deprecated = req.sws.deprecated;
        if( 'operationId' in req.sws ) reqresdata.api.operationId = req.sws.operationId;
        if( 'tags' in req.sws ) reqresdata.api.tags = req.sws.tags;

        // TODO Get additional attributes from coreStats (if any)
    }

    // TODO Body (?)
    // TODO Parameters
    // TODO Source IP address

    return reqresdata;
};

swsProcessor.prototype.processRequest = function (req, res) {

    // Placeholder for sws-specific attributes
    req.sws = {};

    // Try to match to API right away
    this.apiStats.matchRequest(req);

    // Count it in all stat collectors

    // Core stats
    this.coreStats.countRequest(req, res);

    // Timeline
    this.timeline.countRequest(req, res);

    // TODO Check if needed
    this.apiStats.countRequest(req, res);
};

swsProcessor.prototype.processResponse = function (res) {

    var req = res.req;

    // Capture route path for the request, if set by router
    var route_path = '';
    if ("baseUrl" in req) route_path = req.baseUrl;
    if (("route" in req) && ("path" in req.route)) {
        route_path += req.route.path;

    }
    req.sws.route_path = route_path;

    // If request was not matched to Swagger API, set API path:
    // Use route_path, if exist; if not, use originalUrl
    if(!('api_path' in req.sws)){
        req.sws.api_path = (route_path!=''?route_path:req.originalUrl);
    }

    // Pass through Core Statistics
    this.coreStats.countResponse(res);

    // Pass through Timeline
    this.timeline.countResponse(res);

    // Pass through API Statistics
    this.apiStats.countResponse(res);

    // Collect request / response record
    var reqresdata = this.collectRequestResponseData(res);

    // Pass through last errors
    this.lastErrors.processReqResData(reqresdata);

    // Pass through longest request
    this.longestRequests.processReqResData(reqresdata);

    // TODO Push Request/Response Data to Emitter(s)
};


swsProcessor.prototype.getStats = function (fields) {

    var statfields = [];    // Default
    if( (typeof fields !== 'undefined') && (fields instanceof Array)){
        statfields = fields;
    }

    // core statistics are returned always
    // TODO Consider field 'method' to enable/disable method-based stats
    var result = this.coreStats.getStats();

    // return additional statistics per parameters
    // TODO Consider 'all'
    for(var i=0;i<statfields.length;i++){
        switch(statfields[i]){
            case 'timeline':
                result.timeline = this.timeline.getStats();
                break;
            case 'lasterrors':
                result.lasterrors = this.lastErrors.getStats();
                break;
            case 'longestreq':
                result.longestreq = this.longestRequests.getStats();
                break;
            case 'apidefs':
                result.apidefs = this.apiStats.getAPIDefs();
                break;
            case 'apistats':
                result.api = this.apiStats.getAPIStats();
                break;
        }
    }

    return result;
};

module.exports = swsProcessor;
