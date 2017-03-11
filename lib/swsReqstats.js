/**
 * Created by sv2 on 2/18/17.
 * Request / Response statistics
 */

'use strict';

// Request / Response statistics
function swsReqStats() {
    this.requests=0;                // Total number of requests received
    this.responses=0;               // Total number of responses sent
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
    this.max_res_clength=0;         // Average Content length in sent responses
}

swsReqStats.prototype.countRequest = function(clength) {
    this.requests++;
    this.total_req_clength += clength;
    if (this.max_req_clength < clength) this.max_req_clength = clength;
    this.avg_req_clength = this.total_req_clength / this.requests;
};

swsReqStats.prototype.countResponse = function(codeclass,duration,clength) {
    this.responses++;
    this[codeclass]++;
    this.total_time += duration;
    this.avg_time = this.total_time / this.requests;
    if (this.max_time < duration) this.max_time = duration;
    this.total_res_clength += clength;
    if (this.max_res_clength < clength) this.max_res_clength = clength;
    this.avg_res_clength = this.total_res_clength / this.requests;
};

module.exports = swsReqStats;
