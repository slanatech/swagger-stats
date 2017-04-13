/**
 * Created by sv2 on 2/18/17.
 * Timeline Statistics
 */

'use strict';

var util = require('util');
var swsUtil = require('./swsUtil');
var swsReqResStats = require('./swsReqResStats');

function swsTimeline() {

    // Timeline bucket duration in milliseconds
    this.timeline_bucket_duration = 60000;

    // Current Timeline bucket ID
    this.timeline_bucket_current = 0;

    // Timeline length - number of buckets to keep
    this.timeline_length = 60;

    // Timeline of req / res statistics, one entry per minute for past 60 minutes
    // Hash by timestamp divided by timeline_bucket_duration, so we can match finished response to bucket
    this.timeline = {};

}

swsTimeline.prototype.getStats = function(reqresdata) {
    return this;
};

// Create empty timeline going back 60 minutes
swsTimeline.prototype.initialize = function (swsOptions) {
    var curr = Date.now();
    var timelineid = Math.floor(curr / this.timeline_bucket_duration );
    this.timeline_bucket_current = timelineid;
    for (var i = 0; i < this.timeline_length; i++) {
        this.getTimelineBucket(timelineid);
        timelineid--;
    }
};

// Update timeline and stats per tick
swsTimeline.prototype.tick = function (ts,totalElapsedSec) {

    var timelineid = Math.floor( ts / this.timeline_bucket_duration );
    this.timeline_bucket_current = timelineid;

    var currBucket = this.getTimelineBucket(timelineid);
    this.expireTimelineBucket(timelineid - this.timeline_length);

    // Update rates in timeline, only in current bucket
    var currBucketElapsedSec = (ts - timelineid*this.timeline_bucket_duration)/1000;
    currBucket.updateRates(currBucketElapsedSec);
};


swsTimeline.prototype.getTimelineBucket = function (timelineid) {
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

swsTimeline.prototype.expireTimelineBucket = function (timelineid) {
    delete this.timeline[timelineid];
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
