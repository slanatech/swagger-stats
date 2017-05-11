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

    // TODO Remove
    //this.timeline_bucket_duration = 60000;
    //this.timeline_bucket_current = 0;
    //this.timeline_length = 60;

    // Timeline Settings
    this.settings = {
        bucket_duration: 60000,     // Timeline bucket duration in milliseconds
        bucket_current: 0,          // Current Timeline bucket ID
        length: 60                  // Timeline length - number of buckets to keep
    };

    // Timeline of req / res statistics, one entry per minute for past 60 minutes
    // Hash by timestamp divided by settings.bucket_duration, so we can match finished response to bucket
    this.data = {};

}

swsTimeline.prototype.getStats = function(reqresdata) {
    return this;
};

// Create empty timeline going back 60 minutes
swsTimeline.prototype.initialize = function (swsOptions) {
    var curr = Date.now();
    if( swsUtil.supportedOptions.timelineBucketDuration in swsOptions ) {
        this.settings.bucket_duration = swsOptions[swsUtil.supportedOptions.timelineBucketDuration];
    }
    var timelineid = Math.floor(curr / this.settings.bucket_duration );
    this.settings.bucket_current = timelineid;
    for (var i = 0; i < this.settings.length; i++) {
        this.getTimelineBucket(timelineid);
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
    currBucket.updateRates(currBucketElapsedSec);
};


swsTimeline.prototype.getTimelineBucket = function (timelineid) {
    if( (timelineid>0) && (!(timelineid in this.data)) ) {
        this.data[timelineid] = new swsReqResStats();
        // update rates in previous timeline bucket: it becomes closed
        var prevTimelineId = timelineid-1;
        if( prevTimelineId in this.data ) {
            this.data[prevTimelineId].updateRates(this.settings.bucket_duration/1000);
        }
    }
    return this.data[timelineid];
};

swsTimeline.prototype.expireTimelineBucket = function (timelineid) {
    delete this.data[timelineid];
};

// Count request
swsTimeline.prototype.countRequest = function (req, res) {

    // Count in timeline
    this.getTimelineBucket(req.sws.timelineid).countRequest(req.sws.req_clength);
};

// Count finished response
swsTimeline.prototype.countResponse = function (res) {

    var req = res.req;

    // Update timeline stats
    this.getTimelineBucket(req.sws.timelineid).countResponse(
                    res.statusCode,
                    swsUtil.getStatusCodeClass(res.statusCode),
                    req.sws.duration,
                    req.sws.res_clength);

};

module.exports = swsTimeline;
