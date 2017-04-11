/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

'use strict';

var util = require('util');

var swsUtil = require('./swsUtil');
var swsReqResStats = require('./swsReqResStats');

// Constructor
function swsCoreStats() {

    // Timestamp when collecting statistics started
    this.startts = Date.now();

    // Statistics for all requests
    this.all = new swsReqResStats();

    // Statistics for requests by method
    // Initialized with most frequent ones, other methods will be added on demand if actually used
    this.method = {
        'GET': new swsReqResStats(),
        'POST': new swsReqResStats(),
        'PUT': new swsReqResStats(),
        'DELETE': new swsReqResStats()
    };

    // Timeline bucket duration in milliseconds
    this.timeline_bucket_duration = 60000;

    // Current Timeline bucket ID
    this.timeline_bucket_current = 0;

    // Timeline length - number of buckets to keep
    this.timeline_length = 60;

    // Timeline of request statistics, one entry per minute for past 60 minutes
    // Hash by timestamp divided by timeline_bucket_duration, so we can match finished response to bucket
    this.timeline = {};

    // API statistics - entry per API request from swagger
    // Including paths not covered by swagger - those will be created on demand
    this.api = {}
}

// Initialize
swsCoreStats.prototype.init = function () {
    this.initializeTimeline();
};

// Create empty timeline going back 60 minutes
swsCoreStats.prototype.initializeTimeline = function () {
    var curr = Date.now();
    var timelineid = Math.floor(curr / this.timeline_bucket_duration );
    this.timeline_bucket_current = timelineid;
    for (var i = 0; i < this.timeline_length; i++) {
        this.getTimelineBucket(timelineid);
        timelineid--;
    }
};

// Update timeline and stats per tick
swsCoreStats.prototype.tick = function () {
    var ts = Date.now();
    var totalElapsedSec = (ts - this.startts)/1000;
    var timelineid = Math.floor( ts / this.timeline_bucket_duration );
    this.timeline_bucket_current = timelineid;

    var currBucket = this.getTimelineBucket(timelineid);
    this.expireTimelineBucket(timelineid - this.timeline_length);

    // Rates
    this.all.updateRates(totalElapsedSec);
    for( var method in this.method) {
        this.method[method].updateRates(totalElapsedSec);
    }
    // Update rates in timeline, only in current bucket
    var currBucketElapsedSec = (ts - timelineid*this.timeline_bucket_duration)/1000;
    currBucket.updateRates(currBucketElapsedSec);
    // Update Rates in APIs
    for( var path in this.api ) {
        for( var method in this.api[path] ) {
            this.api[path][method].stats.updateRates(totalElapsedSec);
        }
    }
};

swsCoreStats.prototype.getTimelineBucket = function (timelineid) {
    if( (timelineid>0) && (!(timelineid in this.timeline)) ) {
        this.timeline[timelineid] = new swsReqResStats();
        // update rates in previous timeline bucket: it becomes closed
        var prevTimelineId = timelineid-1;
        if( prevTimelineId in this.timeline ) {
            this.timeline[prevTimelineId].updateRates(this.timeline_bucket_duration/1000);
        }
    }
    return this.timeline[timelineid];
};

swsCoreStats.prototype.expireTimelineBucket = function (timelineid) {
    delete this.timeline[timelineid];
};


// Count request
swsCoreStats.prototype.countRequest = function (req, res) {


    // Store context in request
    var ts = Date.now();

    var reqContentLength = 0;
    if('content-length' in req.headers) {
        reqContentLength = parseInt(req.headers['content-length']);
    }

    if(!('sws' in req)) req.sws = {};

    req.sws.startts = ts;
    req.sws.timelineid = Math.floor( ts/this.timeline_bucket_duration );
    req.sws.req_clength = reqContentLength;

    // Count in all
    this.all.countRequest(reqContentLength);

    // Count by method
    var method = req.method;
    if (!(method in this.method)) {
        this.method[method] = new swsReqResStats();
    }
    this.method[method].countRequest(reqContentLength);

    // Count in timeline
    this.getTimelineBucket(req.sws.timelineid).countRequest(reqContentLength);

    // Do not count request in API stats, as at this time we may not know path so can't map to API entry
};


// Count finished response
swsCoreStats.prototype.countResponse = function (res) {

    var req = res.req;

    // Defaults
    var startts = 0;
    var duration = 0;
    var resContentLength = 0;
    var timelineid = 0;
    var path = req.originalUrl;

    if ("_contentLength" in res){
        resContentLength = res['_contentLength'];
    }else{
        // Try header
        if(res.hasHeader('content-length')) {
            resContentLength = res.getHeader('content-length');
        }
    }

    if("sws" in req) {
        startts = req.sws.startts;
        timelineid = req.sws.timelineid;
        var endts = Date.now();
        req['sws'].endts = endts;
        duration = endts - startts;
        req['sws'].duration = duration;
        req['sws'].res_clength = resContentLength;
        path = req['sws'].api_path;
    }

    // Determine status code type
    var codeclass = swsUtil.getStatusCodeClass(res.statusCode);

    // update counts for all requests
    this.all.countResponse(res.statusCode,codeclass,duration,resContentLength);

    // Update method-specific stats
    var method = req.method;
    if (method in this.method) {
        var mstat = this.method[method];
        mstat.countResponse(res.statusCode,codeclass,duration,resContentLength);
    }

    // Update timeline stats
    this.getTimelineBucket(timelineid).countResponse(res.statusCode,codeclass,duration,resContentLength);

    // TODO Count only on response and make processing for API consistent

    // Update API stats
    var apiEntry = this.findOrCreateAPIEntry(path,method);
    if(apiEntry){
        // do both count request and count response in API stats, as only at this time we know path so can map request / response to API entry
        apiEntry.stats.countRequest(req.sws.req_clength);
        apiEntry.stats.countResponse(res.statusCode,codeclass,duration,resContentLength);
    }

};

// Add information about last error
swsCoreStats.prototype.addError = function(reqresdata) {
    this.last_errors.push(reqresdata);
    // Clean up if more than allowed
    if (this.last_errors.length > 100) {
        this.last_errors.shift();
    }
};

// Add API Entry
swsCoreStats.prototype.addAPIEntry = function(path, method, apiEntry) {
    if( !(path in this.api)) {
        this.api[path] = {};
    }
    this.api[path][method] = apiEntry;
};

// Look up API Entry by path and method, retrun null if not found
swsCoreStats.prototype.getAPIEntry = function(path, method) {
    if( !(path in this.api) ) return null;
    if( !(method in this.api[path]) ) return null;
    return this.api[path][method];
};

swsCoreStats.prototype.findOrCreateAPIEntry = function(path, method) {
    var e = this.getAPIEntry(path, method);
    if( e != null ) return e;
    // This is API which was not pre-defined in swagger spec
    // Create API entry on the fly, without additional properties
    e = { /*route_path: path, */ stats: new swsReqResStats(), swagger: false };
    this.addAPIEntry(path, method, e);
    return e;
};

module.exports = swsCoreStats;
