/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

// TODO Consider moving out API Data (stats) to swsCoreStats
// TODO Consider renaming this class to swsProcessor

'use strict';

var util = require('util');

var ReqStats = require('./swsReqstats');

// TODO Process res.statusMessage
// TODO Keep a list of most recent errors
// TODO Keep a list of most frequent errors

// Constructor
function swsAPIData() {

    // Timestamp when collecting statistics started
    this.startts = Date.now();

    // TODO Timeline of request statistics, one entry per minute for past 60 minutes
    // Hash by timestamp divided by 60 seconds, so we can match finished response to bucket
    this.timeline = {};

    // Statistics for all requests
    this.all = new ReqStats();

    // Statistics for requests by method
    // Initialized with most frequent ones, other methods will be added on demand if actually used
    this.method = {
        'GET': new ReqStats(),
        'POST': new ReqStats(),
        'PUT': new ReqStats(),
        'DELETE': new ReqStats()
    };

    // Timeline bucket duration in milliseconds
    this.timeline_bucket_duration = 60000;

    // Timeline length - number of buckets to keep
    this.timeline_length = 60;


    // Last 100 errors
    this.last_errors = [];

    // TODO top 10(?) requests with longest processing time
    this.longest_requests = [];

    // API statistics - entry per API request from swagger
    // Including paths not covered by swagger - those will be created on demand
    this.api = {}

}

// Initialize
swsAPIData.prototype.init = function (swsOptions) {
    this.initializeAPI(swsOptions);
    this.initializeTimeline();
    setInterval(this.tick, 100, this);
};

// Tick - called with specified interval to refresh timelines
swsAPIData.prototype.tick = function (that) {
    // Remove old entries from timeline, add new entry if needed
    var ts = Date.now();
    var timelineid = Math.floor( ts / that.timeline_bucket_duration );
    that.getTimelineBucket(timelineid);
    that.expireTimelineBucket(timelineid - that.timeline_length);
};

// Create empty timeline going back 60 minutes
swsAPIData.prototype.initializeTimeline = function () {
    var curr = Date.now();
    var timelineid = Math.floor(curr / this.timeline_bucket_duration );
    for (var i = 0; i < this.timeline_length; i++) {
        this.getTimelineBucket(timelineid);
        timelineid--;
    }
};

swsAPIData.prototype.getTimelineBucket = function (timelineid) {
    if( (timelineid>0) && (!(timelineid in this.timeline)) ) {
        this.timeline[timelineid] = new ReqStats();
    }
    return this.timeline[timelineid];
};

swsAPIData.prototype.expireTimelineBucket = function (timelineid) {
    delete this.timeline[timelineid];
};

// Initialize API stats based on swagger definition
// TODO Store data about API in a structure that will be easy to match when counting requests
// TODO convert {param} to :param, so we can match directly with route.path
swsAPIData.prototype.initializeAPI = function (swsOptions) {
    if(!swsOptions) return;
    if(!swsOptions.swaggerSpec) return;
    if(!swsOptions.swaggerSpec.paths) return;

    // Enumerate all paths entries
    for(var path in swsOptions.swaggerSpec.paths ){
        console.log(path);
        this.api[path] = {};
        var pathDef = swsOptions.swaggerSpec.paths[path];
        var operations = ['get','put','post','delete','options','head','patch'];
        for(var i=0;i<operations.length;i++){
            var op = operations[i];
            if(op in pathDef){
                console.log('   ' + op);
                var opDef = pathDef[op];
                var opMethod = op.toUpperCase();
                var apiEntry = { stats: new ReqStats() };
                if( 'tags' in opDef ) apiEntry.tags = opDef.tags;
                if( 'summary' in opDef ) apiEntry.summary = opDef.summary;
                if( 'description' in opDef ) apiEntry.description = opDef.description;
                if( 'operationId' in opDef ) apiEntry.operationId = opDef.operationId;
                if( 'deprecated' in opDef ) apiEntry.deprecated = opDef.deprecated;
                this.api[path][opMethod] = apiEntry;
            }
        }
    }
};


// Count request
swsAPIData.prototype.countRequest = function (req, res) {


    // Store context in request
    var ts = Date.now();

    var reqContentLength = 0;
    if('content-length' in req.headers) {
        reqContentLength = parseInt(req.headers['content-length']);
    }

    req.swaggerstats = {
        startts: ts,
        timelineid: Math.floor( ts/this.timeline_bucket_duration ),
        req_clength: reqContentLength
    };

    // Count in all
    this.all.countRequest(reqContentLength);

    // Count by method
    var method = req.method;
    if (!(method in this.method)) {
        this.method[method] = new ReqStats();
    }
    this.method[method].countRequest(reqContentLength);

    // Count in timeline
    this.getTimelineBucket(req.swaggerstats.timelineid).countRequest(reqContentLength);

};

// Return response status code class
swsAPIData.prototype.getStatusCodeClass = function (code) {
    if (code < 200) return "info";
    if (code < 300) return "success";
    if (code < 400) return "redirect";
    if (code < 500) return "client_error";
    return "server_error";
};

// Count finished response
swsAPIData.prototype.countResponse = function (res) {

    var req = res.req;

    // Determine duration
    var startts = 0;
    var duration = 0;
    var resContentLength = 0;
    var timelineid = 0;

    if ("_contentLength" in res){
        resContentLength = res['_contentLength'];
    }else{
        // Try header
        if(res.hasHeader('content-length')) {
            resContentLength = res.getHeader('content-length');
        }
    }

    if ("swaggerstats" in req) {
        startts = req.swaggerstats.startts;
        timelineid = req.swaggerstats.timelineid;
        var endts = Date.now();
        req['swaggerstats'].endts = endts;
        duration = endts - startts;
        req['swaggerstats'].duration = duration;
        req['swaggerstats'].res_clength = resContentLength;
    }

    // Determine status code type
    var codeclass = this.getStatusCodeClass(res.statusCode);

    // update counts for all requests
    this.all.countResponse(codeclass,duration,resContentLength);

    // Update method-specific stats
    var method = req.method;
    if (method in this.method) {
        var mstat = this.method[method];
        mstat.countResponse(codeclass,duration,resContentLength);
    }

    // Update timeline stats
    this.getTimelineBucket(timelineid).countResponse(codeclass,duration,resContentLength);

};

// Collect all data for request/response pair
swsAPIData.prototype.collectRequestResponseData = function (res) {
    var req = res.req;
    var codeclass = this.getStatusCodeClass(res.statusCode);

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

    if ("swaggerstats" in req) {
        reqresdata.startts = req.swaggerstats.startts;
        reqresdata.endts = req.swaggerstats.endts;
        reqresdata.duration = req.swaggerstats.duration;
        reqresdata.req_clength = req.swaggerstats.req_clength;
        reqresdata.res_clength = req.swaggerstats.res_clength;
    }

    // Request Headers
    if ("headers" in req) {
        reqresdata.req_headers = {};
        for(var hdr in req.headers){
            reqresdata.req_headers[hdr] = req.headers[hdr];
        }
    }

    if ("_headers" in res){
        reqresdata.res_headers = {};
        for(var hdr in res['_headers']){
            reqresdata.res_headers[hdr] = res['_headers'][hdr];
        }
    }

    // Matched route path
    if ("route" in req) {
        if("path" in req.route){
            reqresdata.route = { path: req.route.path };
        }
    }

    // TODO Body
    // TODO Parameters
    // TODO Source IP address
    return reqresdata;
};

swsAPIData.prototype.processRequest = function (req, res) {
    this.countRequest(req, res);
};

swsAPIData.prototype.processResponse = function (res) {
    this.countResponse(res);

    // Collect data about request / response
    var reqresdata = this.collectRequestResponseData(res);

    // Store information about last errors
    if (reqresdata.codeclass == "client_error" || reqresdata.codeclass == "server_error") {
        this.last_errors.push(reqresdata);
        // TODO Clean up if more then allowed
        if (this.last_errors.length > 100) {
            this.last_errors.shift();
        }
    }

    // TODO Push Request/Response Data to Emitter(s)
};


module.exports = swsAPIData;
