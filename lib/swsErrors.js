/**
 * Created by sv2 on 2/18/17.
 * Errors stats
 */

'use strict';

var util = require('util');
var debug = require('debug')('sws:errors');
var swsUtil = require('./swsUtil');

function swsErrors() {


    // Store counts per each error code
    this.statuscode_count = {};

    // Store Last 100 errors
    //this.last_errors = [];

}

swsErrors.prototype.getStats = function() {
    return { statuscode: this.statuscode_count };
};

// Add information about error
swsErrors.prototype.countResponse = function (res) {
    if(!swsUtil.isError(res.statusCode)) return;

    // Increase count by code
    if(!(res.statusCode in this.statuscode_count)) {
        this.statuscode_count[res.statusCode] = 0;
    }
    this.statuscode_count[res.statusCode]++;

};

module.exports = swsErrors;
