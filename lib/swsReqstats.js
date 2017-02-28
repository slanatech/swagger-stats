/**
 * Created by sv2 on 2/18/17.
 * Request statistics
 */

'use strict';

// Request statistics
function swsReqStats() {
    this.requests=0;                // Total number of requests
    this.info=0;                    // Total number of informational responces
    this.success=0;                 // Total number of success responces
    this.redirect=0;                // Total number of redirection responces
    this.client_error=0;           // Total number of client error responces
    this.server_error=0;           // Total number of server error responces
    this.total_time=0;              // Sum of total processing time: from request received to response finished
    this.avg_time=0;                // Average processing time
}

module.exports = swsReqStats;
