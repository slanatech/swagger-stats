/**
 * Created by sv2 on 2/18/17.
 * Request statistics
 */

'use strict';

// Request statistics
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
}

swsReqStats.prototype.countRequest = function() {
    this.requests++;
};

swsReqStats.prototype.countResponse = function(codeclass,duration) {
    this.responses++;
    this[codeclass]++;
    this.total_time += duration;
    this.avg_time = this.total_time / this.requests;
    if (this.max_time < duration) {
        this.max_time = duration;
    }
};

module.exports = swsReqStats;
