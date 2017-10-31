/**
 * Created by sv2 on 2/18/17.
 * Request / Response statistics
 */

'use strict';
var swsUtil = require('./swsUtil');

// Request / Response statistics
// apdex_threshold: Thresold for apdex calculation, in milliseconds 50 (ms) by default
function swsReqResStats(apdex_threshold) {
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
    this.apdex_threshold = typeof apdex_threshold !== 'undefined' ? apdex_threshold : 50;   // Apdex threshold
    this.apdex_satisfied = 0;       // Total number of "satisfied" responses for Apdex: time <= apdex_threshold
    this.apdex_tolerated = 0;       // Total number of "tolerated" responses for Apdex: time <= (apdex_threshold*4)
    this.apdex_score = 0;           // Apdex score: (apdex_satisfied + (apdex_tolerated/2))/responses
    // TODO Consider: counts by exact response code
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

    // Apdex: https://en.wikipedia.org/wiki/Apdex
    if( codeclass=="success" ) {
        if (duration <= this.apdex_threshold) {
            this.apdex_satisfied++;
        } else if (duration <= (this.apdex_threshold * 4)) {
            this.apdex_tolerated++;
        }
    }
    this.apdex_score = (this.apdex_satisfied + (this.apdex_tolerated/2)) / this.responses;
};

swsReqResStats.prototype.updateRates = function(elapsed) {
    //this.req_rate = Math.round( (this.requests / elapsed) * 1e2 ) / 1e2; //;
    this.req_rate = this.requests / elapsed;
    this.err_rate = this.errors / elapsed;
};

module.exports = swsReqResStats;
