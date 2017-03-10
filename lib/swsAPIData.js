/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

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

    // TODO remove
    this.active = 0;

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

    // TODO API statistics - entry per API request from swagger
    // All requestst - any URL- or include to above

}

// Initialize
swsAPIData.prototype.init = function () {
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

// Count request
swsAPIData.prototype.countRequest = function (req, res) {


    // Store context in request
    var ts = Date.now();
    req.swaggerstats = {
        startts: ts,
        timelineid: Math.floor( ts/this.timeline_bucket_duration )
    };

    // Count in all
    this.all.countRequest();

    // Count by method
    var method = req.method;
    if (!(method in this.method)) {
        this.method[method] = new ReqStats();
    }
    this.method[method].countRequest();

    // Count in timeline
    this.getTimelineBucket(req.swaggerstats.timelineid).countRequest();

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
    var timelineid = 0;
    if ("swaggerstats" in req) {
        startts = req.swaggerstats.startts;
        timelineid = req.swaggerstats.timelineid;
        var endts = Date.now();
        req['swaggerstats'].endts = endts;
        duration = endts - startts;
        req['swaggerstats'].duration = duration;
    }

    // Determine status code type
    var codeclass = this.getStatusCodeClass(res.statusCode);

    // update counts for all requests
    this.all.countResponse(codeclass,duration);

    // Update method-specific stats
    var method = req.method;
    if (method in this.method) {
        var mstat = this.method[method];
        mstat.countResponse(codeclass,duration);
    }

    // Update timeline stats
    this.getTimelineBucket(timelineid).countResponse(codeclass,duration);

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
    }
    // Headers
    if ("headers" in req) {
        reqresdata.headers = {};
        for(var hdr in req.headers){
            reqresdata.headers[hdr] = req.headers[hdr];
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

    // TODO Push Request/Response Data to tracker
};


module.exports = swsAPIData;
