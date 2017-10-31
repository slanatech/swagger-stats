/**
 * Created by sv2 on 2/18/17.
 * Timeline Statistics
 */

'use strict';

var util = require('util');
var debug = require('debug')('sws:timeline');
var swsUtil = require('./swsUtil');
var swsReqResStats = require('./swsReqResStats');

function swsTimeline() {

    // Options
    this.options = null;

    // Timeline Settings
    this.settings = {
        bucket_duration: 60000,     // Timeline bucket duration in milliseconds
        bucket_current: 0,          // Current Timeline bucket ID
        length: 60                  // Timeline length - number of buckets to keep
    };

    // Timeline of req / res statistics, one entry per minute for past 60 minutes
    // Hash by timestamp divided by settings.bucket_duration, so we can match finished response to bucket
    this.data = {};

    this.startTime  = process.hrtime();
    this.startUsage = process.cpuUsage();

    // average memory usage values on time interval
    this.memorySum = process.memoryUsage();
    this.memoryMeasurements = 1;
}

swsTimeline.prototype.getStats = function(reqresdata) {
    return { settings: this.settings, data: this.data };
};

// Create empty timeline going back 60 minutes
swsTimeline.prototype.initialize = function (swsOptions) {

    this.options = swsOptions;

    var curr = Date.now();
    if( swsUtil.supportedOptions.timelineBucketDuration in swsOptions ) {
        this.settings.bucket_duration = swsOptions[swsUtil.supportedOptions.timelineBucketDuration];
    }
    var timelineid = Math.floor(curr / this.settings.bucket_duration );
    this.settings.bucket_current = timelineid;
    for (var i = 0; i < this.settings.length; i++) {
        this.openTimelineBucket(timelineid);
        timelineid--;
    }
};

// Update timeline and stats per tick
swsTimeline.prototype.tick = function (ts,totalElapsedSec) {

    var timelineid = Math.floor( ts / this.settings.bucket_duration );
    this.settings.bucket_current = timelineid;

    var currBucket = this.getTimelineBucket(timelineid);
    this.expireTimelineBucket(timelineid - this.settings.length);

    // Update rates in timeline, only in current bucket
    var currBucketElapsedSec = (ts - timelineid*this.settings.bucket_duration)/1000;
    currBucket.stats.updateRates(currBucketElapsedSec);

    // Update sys stats in current bucket
    var cpuPercent = swsUtil.swsCPUUsagePct(this.startTime, this.startUsage);
    currBucket.sys.cpu = cpuPercent;

    this.updateMemoryUsage(process.memoryUsage());
    this.setMemoryStats(currBucket);
};


swsTimeline.prototype.getTimelineBucket = function (timelineid) {
    if( (timelineid>0) && (!(timelineid in this.data)) ) {

        // Open new bucket
        this.openTimelineBucket(timelineid);

        // Close previous bucket
        this.closeTimelineBucket(timelineid-1);

    }
    return this.data[timelineid];
};

swsTimeline.prototype.openTimelineBucket = function(timelineid) {

    // Open new bucket
    this.data[timelineid] = { stats: new swsReqResStats(this.options.apdexThreshold), sys: { rss:0, heapTotal:0, heapUsed:0, external:0, cpu: 0} };

};

swsTimeline.prototype.closeTimelineBucket = function(timelineid) {

    if( !(timelineid in this.data) ) return;

    // Close bucket

    // update rates in previous timeline bucket: it becomes closed
    this.data[timelineid].stats.updateRates(this.settings.bucket_duration/1000);

    // Update sys stats
    var cpuPercent = swsUtil.swsCPUUsagePct(this.startTime, this.startUsage);
    this.data[timelineid].sys.cpu = cpuPercent;

    //debug('CPU: %s on %d', cpuPercent.toFixed(4), timelineid);

    var currMem = process.memoryUsage();
    this.updateMemoryUsage(currMem);
    this.setMemoryStats(this.data[timelineid]);
    //debug('Mem: %s - CLOSE', this.data[timelineid].sys.heapUsed.toFixed(0));

    // start from last
    this.memorySum = currMem;
    this.memoryMeasurements = 1;
    //debug('Mem: %s - CURR %s - START %d', this.memorySum.heapUsed.toFixed(0),currMem.heapUsed,this.memoryMeasurements);

    this.startTime  = process.hrtime();
    this.startUsage = process.cpuUsage();

};

swsTimeline.prototype.expireTimelineBucket = function (timelineid) {
    delete this.data[timelineid];
};

swsTimeline.prototype.updateMemoryUsage = function(currMem){
    this.memoryMeasurements++;
    this.memorySum.rss += currMem.rss;
    this.memorySum.heapTotal += currMem.heapTotal;
    this.memorySum.heapUsed += currMem.heapUsed;
    this.memorySum.external += currMem.external;
    //debug('Mem: %s - CURR %s - UPDATE %d', Math.round(this.memorySum.heapUsed/this.memoryMeasurements),currMem.heapUsed,this.memoryMeasurements);
};

swsTimeline.prototype.setMemoryStats = function(bucket){
    if(!('sys' in bucket )) return;
    bucket.sys.rss = Math.round(this.memorySum.rss/this.memoryMeasurements);
    bucket.sys.heapTotal = Math.round(this.memorySum.heapTotal/this.memoryMeasurements);
    bucket.sys.heapUsed = Math.round(this.memorySum.heapUsed/this.memoryMeasurements);
    bucket.sys.external = Math.round(this.memorySum.external/this.memoryMeasurements);
};

// Count request
swsTimeline.prototype.countRequest = function (req, res) {

    // Count in timeline
    this.getTimelineBucket(req.sws.timelineid).stats.countRequest(req.sws.req_clength);
};

// Count finished response
swsTimeline.prototype.countResponse = function (res) {

    var req = res.req;

    // Update timeline stats
    this.getTimelineBucket(req.sws.timelineid).stats.countResponse(
                    res.statusCode,
                    swsUtil.getStatusCodeClass(res.statusCode),
                    req.sws.duration,
                    req.sws.res_clength);

};

module.exports = swsTimeline;
