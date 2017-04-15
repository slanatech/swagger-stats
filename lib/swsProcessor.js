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
}

// Initialize
swsProcessor.prototype.init = function (swsOptions) {

    this.coreStats.initialize(swsOptions);

    this.timeline.initialize(swsOptions);

    this.apiStats.initialize(swsOptions);

    // Start tick
    setInterval(this.tick, 500, this);
};

// Tick - called with specified interval to refresh timelines
swsProcessor.prototype.tick = function (that) {

    var ts = Date.now();
    var totalElapsedSec = (ts - that.coreStats.startts)/1000;

    that.coreStats.tick(ts,totalElapsedSec);

    that.timeline.tick(ts,totalElapsedSec);

    that.apiStats.tick(ts,totalElapsedSec);

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

    // Setup sws props and pass to stats processors
    var ts = Date.now();

    var reqContentLength = 0;
    if('content-length' in req.headers) {
        reqContentLength = parseInt(req.headers['content-length']);
    }

    req.sws.startts = ts;
    req.sws.timelineid = Math.floor( ts/ this.timeline.settings.bucket_duration );
    req.sws.req_clength = reqContentLength;

    // Try to match to API right away
    this.apiStats.matchRequest(req);

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
    if (("route" in req) && ("path" in req.route)) {
        if (("baseUrl" in req) && (req.baseUrl != undefined)) route_path = req.baseUrl;
        route_path += req.route.path;
        req.sws.route_path = route_path;
    }

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
    var result = this.coreStats.getStats();

    // return additional statistics per parameters
    // TODO Consider 'all'
    for(var i=0;i<statfields.length;i++){
        switch(statfields[i]){
            case 'method':
                result.method = this.coreStats.getMethodStats();
                break;
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
                result.apistats = this.apiStats.getAPIStats();
                break;
        }
    }

    return result;
};

module.exports = swsProcessor;
