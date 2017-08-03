/**
 * Created by sv2 on 2/18/17.
 * Last Errors
 */

'use strict';

var util = require('util');
var debug = require('debug')('sws:lasterrors');
var swsUtil = require('./swsUtil');

function swsLastErrors() {

    // Store Last 100 errors
    this.last_errors = [];

}

swsLastErrors.prototype.getStats = function() {
    return this.last_errors;
};

// Add information about last error
swsLastErrors.prototype.addError = function(rrr) {
    this.last_errors.push(rrr);
    // Clean up if more than allowed
    if (this.last_errors.length > 100) {
        this.last_errors.shift();
    }
};

// Check if this qualifies as longest request, and store is yes
swsLastErrors.prototype.processReqResData = function(rrr) {
    if(swsUtil.isError(rrr.http.response.code)){
        this.addError(rrr);
    }
};

module.exports = swsLastErrors;
