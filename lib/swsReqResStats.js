/**
 * Created by sv2 on 2/18/17.
 * Request / Response statistics
 */

'use strict';
var swsUtil = require('./swsUtil');

// Request / Response statistics
function swsReqResStats() {
    this.requests=0;                // Total number of requests received
    this.responses=0;               // Total number of responses sent
    this.errors=0;                  // Total number of error responses
    this.info=0;                    // Total number of informational responses
    this.success=0;                 // Total number of success responses
    this.redirect=0;                // Total number of redirection responses
    this.client_error=0;            // Total number of client error responses
    this.server_error=0;            // Total number of server error responses
    this.total_time=0;              // Sum of total processing time (from request received to response finished)
    this.max_time=0;                // Maximum observed processed time
    this.avg_time=0;                // Average processing time
    this.total_req_clength=0;       // Total (Sum) of Content Lengths of received requests
    this.max_req_clength=0;         // Maximum observed Content length in received requests
    this.avg_req_clength=0;         // Average Content Length in received requests
    this.total_res_clength=0;       // Total (Sum) of Content Lengths of sent responses
    this.max_res_clength=0;         // Maximum observed Content Length in sent responses
    this.avg_res_clength=0;         // Average Content Length in sent responses
    this.req_rate=0;                // Request Rate
    this.err_rate=0;                // Error Rate

    // TODO Counts by exact response code
    // TODO Histogram of durations ( processing time ) + configurable buckets
    // TODO Histogram of request size ( content length ) + configurable buckets
    // TODO Histogram of response size ( content length ) + configurable buckets

}

swsReqResStats.prototype.countRequest = function(clength) {
    this.requests++;
    this.total_req_clength += clength;
    if (this.max_req_clength < clength) this.max_req_clength = clength;
    this.avg_req_clength = Math.floor(this.total_req_clength / this.requests);
};

swsReqResStats.prototype.countResponse = function(code,codeclass,duration,clength) {
    this.responses++;
    this[codeclass]++;
    if( swsUtil.isError(code) ) this.errors++;
    this.total_time += duration;
    this.avg_time = this.total_time / this.requests;
    if (this.max_time < duration) this.max_time = duration;
    this.total_res_clength += clength;
    if (this.max_res_clength < clength) this.max_res_clength = clength;
    this.avg_res_clength = Math.floor(this.total_res_clength / this.responses);
};

swsReqResStats.prototype.updateRates = function(elapsed) {
    //this.req_rate = Math.round( (this.requests / elapsed) * 1e2 ) / 1e2; //;
    this.req_rate = this.requests / elapsed;
    this.err_rate = this.errors / elapsed;
};

module.exports = swsReqResStats;
