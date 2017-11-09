/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

'use strict';

var util = require('util');
var debug = require('debug')('sws:corestats');
var promClient = require("prom-client");

var swsUtil = require('./swsUtil');
var swsReqResStats = require('./swsReqResStats');

// Constructor
function swsCoreStats() {

    // Options
    this.options = null;

    // Timestamp when collecting statistics started
    this.startts = Date.now();

    // Statistics for all requests
    this.all = null;

    // Statistics for requests by method
    // Initialized with most frequent ones, other methods will be added on demand if actually used
    this.method = null;

    // System statistics
    this.sys = null;

    // CPU
    this.startTime  = null;
    this.startUsage = null;

    // Array with last 5 hrtime / cpuusage, to calculate CPU usage during the last second sliding window ( 5 ticks )
    this.startTimeAndUsage = null;

    // Prometheus metrics
    this.promClientMetrics = {};

    this.promClientMetrics.api_all_request_total = new promClient.Counter({
        name: swsUtil.swsMetrics.api_all_request_total.name,
        help: swsUtil.swsMetrics.api_all_request_total.help });

    this.promClientMetrics.api_all_success_total = new promClient.Counter({
        name: swsUtil.swsMetrics.api_all_success_total.name,
        help: swsUtil.swsMetrics.api_all_success_total.help });
    this.promClientMetrics.api_all_errors_total = new promClient.Counter({
        name: swsUtil.swsMetrics.api_all_errors_total.name,
        help: swsUtil.swsMetrics.api_all_errors_total.help });
    this.promClientMetrics.api_all_client_error_total = new promClient.Counter({
        name: swsUtil.swsMetrics.api_all_client_error_total.name,
        help: swsUtil.swsMetrics.api_all_client_error_total.help });
    this.promClientMetrics.api_all_server_error_total = new promClient.Counter({
        name: swsUtil.swsMetrics.api_all_server_error_total.name,
        help: swsUtil.swsMetrics.api_all_server_error_total.help });
    this.promClientMetrics.api_all_request_in_processing_total = new promClient.Gauge({
        name: swsUtil.swsMetrics.api_all_request_in_processing_total.name,
        help: swsUtil.swsMetrics.api_all_request_in_processing_total.help });

    this.promClientMetrics.nodejs_process_memory_rss_bytes = new promClient.Gauge({
        name: swsUtil.swsMetrics.nodejs_process_memory_rss_bytes.name,
        help: swsUtil.swsMetrics.nodejs_process_memory_rss_bytes.help });
    this.promClientMetrics.nodejs_process_memory_heap_total_bytes = new promClient.Gauge({
        name: swsUtil.swsMetrics.nodejs_process_memory_heap_total_bytes.name,
        help: swsUtil.swsMetrics.nodejs_process_memory_heap_total_bytes.help });
    this.promClientMetrics.nodejs_process_memory_heap_used_bytes = new promClient.Gauge({
        name: swsUtil.swsMetrics.nodejs_process_memory_heap_used_bytes.name,
        help: swsUtil.swsMetrics.nodejs_process_memory_heap_used_bytes.help });
    this.promClientMetrics.nodejs_process_memory_external_bytes = new promClient.Gauge({
        name: swsUtil.swsMetrics.nodejs_process_memory_external_bytes.name,
        help: swsUtil.swsMetrics.nodejs_process_memory_external_bytes.help });
    this.promClientMetrics.nodejs_process_cpu_usage_percentage = new promClient.Gauge({
        name: swsUtil.swsMetrics.nodejs_process_cpu_usage_percentage.name,
        help: swsUtil.swsMetrics.nodejs_process_cpu_usage_percentage.help });

}

// Initialize
swsCoreStats.prototype.initialize = function (swsOptions) {

    this.options = swsOptions;

    // Statistics for all requests
    this.all = new swsReqResStats(this.options.apdexThreshold);

    // Statistics for requests by method
    // Initialized with most frequent ones, other methods will be added on demand if actually used
    this.method = {
        'GET': new swsReqResStats(this.options.apdexThreshold),
        'POST': new swsReqResStats(this.options.apdexThreshold),
        'PUT': new swsReqResStats(this.options.apdexThreshold),
        'DELETE': new swsReqResStats(this.options.apdexThreshold)
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

    // CPU
    this.startTime  = process.hrtime();
    this.startUsage = process.cpuUsage();

    // Array with last 5 hrtime / cpuusage, to calculate CPU usage during the last second sliding window ( 5 ticks )
    this.startTimeAndUsage = [
        { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() },
        { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() },
        { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() },
        { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() },
        { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() }
    ];

};

swsCoreStats.prototype.getStats = function () {
    return { startts: this.startts, all: this.all, sys: this.sys };
};

swsCoreStats.prototype.getMethodStats = function () {
    return this.method;
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
    // #22 Handle properly if any property is missing
    this.sys.rss = 'rss' in memUsage ? memUsage.rss : 0;
    this.sys.heapTotal = 'heapTotal' in memUsage ? memUsage.heapTotal : 0;
    this.sys.heapUsed = 'heapUsed' in memUsage ? memUsage.heapUsed : 0;
    this.sys.external = 'external' in memUsage ? memUsage.external : 0;

    var startTU = this.startTimeAndUsage.shift();

    var cpuPercent = swsUtil.swsCPUUsagePct(startTU.hrtime, startTU.cpuUsage);

    this.startTimeAndUsage.push( { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() } );

    //this.startTime  = process.hrtime();
    //this.startUsage = process.cpuUsage();

    this.sys.cpu = cpuPercent;

    // Update prom-client metrics
    this.promClientMetrics.nodejs_process_memory_rss_bytes.set(this.sys.rss);
    this.promClientMetrics.nodejs_process_memory_heap_total_bytes.set(this.sys.heapTotal);
    this.promClientMetrics.nodejs_process_memory_heap_used_bytes.set(this.sys.heapUsed);
    this.promClientMetrics.nodejs_process_memory_external_bytes.set(this.sys.external);
    this.promClientMetrics.nodejs_process_cpu_usage_percentage.set(this.sys.cpu);
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

    // Update prom-client metrics
    this.promClientMetrics.api_all_request_total.inc();
    this.promClientMetrics.api_all_request_in_processing_total.inc();
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

    // Update Prometheus metrics
    switch(codeclass){
        case "success":
            this.promClientMetrics.api_all_success_total.inc();
            break;
        case "redirect":
            // NOOP //
            break;
        case "client_error":
            this.promClientMetrics.api_all_errors_total.inc();
            this.promClientMetrics.api_all_client_error_total.inc();
            break;
        case "server_error":
            this.promClientMetrics.api_all_errors_total.inc();
            this.promClientMetrics.api_all_server_error_total.inc();
            break;
    }
    this.promClientMetrics.api_all_request_in_processing_total.dec();

};

module.exports = swsCoreStats;
