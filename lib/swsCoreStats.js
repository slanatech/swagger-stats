/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

'use strict';

var util = require('util');
var debug = require('debug')('sws:corestats');

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

    // System statistics
    this.sys = {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        cpu: 0
        // TODO event loop delays
    };

    // TEMP - CPU
    this.startTime  = process.hrtime();
    this.startUsage = process.cpuUsage();
}

// Initialize
swsCoreStats.prototype.initialize = function (swsOptions) {
};

swsCoreStats.prototype.getStats = function () {
    return { startts: this.startts, all: this.all, sys: this.sys };
};

swsCoreStats.prototype.getMethodStats = function () {
    return this.method;
};

swsCoreStats.prototype.getMetrics = function () {

    var metrics = '';

    metrics += '# HELP sws_http_requests_total The total number of HTTP requests\n';
    metrics += '# TYPE sws_http_requests_total counter\n';
    metrics += 'sws_http_requests_total ' + this.all.requests + '\n';

    // TODO Define list of metrics, define "addMetric" helper

    return metrics;
};


// Update timeline and stats per tick
swsCoreStats.prototype.tick = function (ts,totalElapsedSec) {

    // Rates
    this.all.updateRates(totalElapsedSec);
    for( var method in this.method) {
        this.method[method].updateRates(totalElapsedSec);
    }

    // System stats
    this.calculateSystemStats(ts,totalElapsedSec);
};

// Calculate and store system statistics
swsCoreStats.prototype.calculateSystemStats = function(ts,totalElapsedSec) {

    // Memory
    var memUsage = process.memoryUsage();

    // See https://stackoverflow.com/questions/12023359/what-do-the-return-values-of-node-js-process-memoryusage-stand-for
    this.sys.rss = memUsage.rss;
    this.sys.heapTotal = memUsage.heapTotal;
    this.sys.heapUsed = memUsage.heapUsed;
    this.sys.external = memUsage.external;

    var cpuPercent = swsUtil.swsCPUUsagePct(this.startTime, this.startUsage);

    this.startTime  = process.hrtime();
    this.startUsage = process.cpuUsage();

    this.sys.cpu = cpuPercent;
};

// Count request
swsCoreStats.prototype.countRequest = function (req, res) {

    // Count in all
    this.all.countRequest(req.sws.req_clength);

    // Count by method
    var method = req.method;
    if (!(method in this.method)) {
        this.method[method] = new swsReqResStats();
    }
    this.method[method].countRequest(req.sws.req_clength);
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

    // TODO move all this to Processor, so it'll be in single place

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
};

module.exports = swsCoreStats;
