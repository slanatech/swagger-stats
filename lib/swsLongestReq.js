/**
 * Created by sv2 on 2/18/17.
 * Set of Longest Requests
 * Requests with longest observed handle time, since star
 */

'use strict';

var util = require('util');
var debug = require('debug')('sws:longestreq');
var swsUtil = require('./swsUtil');

function swsLongestRequests() {

    // Highest duration from all stored requests
    this.highest = -1;

    // Lowest duration from all stored requests
    this.lowest = -1;  // will be updated by first request

    // Max number of requests to keep.
    // Should not be too big as we're going keep ordered array of longest requests
    this.capacity = 100;

    // true if full
    this.full = false;

    // Store 100 longest requests
    this.longest_requests = [];
}


swsLongestRequests.prototype.getStats = function() {
    return this.longest_requests;
};

swsLongestRequests.prototype.placeReqResData = function(rrr) {

    var duration = rrr.responsetime;

    if( duration >= this.highest ){
        this.highest = duration;
        if(this.lowest==-1) this.lowest = duration; // this would be a case of first request
        this.longest_requests.push(rrr); // add to the end as highest
        return;
    }

    if( duration <= this.lowest ) {
        this.lowest = duration;
        this.longest_requests.unshift(rrr);  // add to the front as lowest
        return;
    }

    // we need to find right place for it
    // iterate over array and insert new record right before longer one
    var idx=-1;
    for(var i=0;(i<this.longest_requests.length) && (idx==-1);i++){
        if( duration < this.longest_requests[i].responsetime ){
            idx = i;
        }
    }

    if(idx!=-1){
        this.longest_requests.splice(idx,0,rrr);
    }
};

// Check if this qualifies as longest request, and store is yes
swsLongestRequests.prototype.processReqResData = function(rrr) {

    var duration = rrr.responsetime;

    if( !this.full ){
        // Filling up - store all requests
        this.placeReqResData(rrr);
        this.full = (this.longest_requests.length===this.capacity);
        return;
    }

    // Request is ignored when it's handle time < lowest, and no more space
    if( duration < this.lowest ) return;

    // Evict smallest one
    this.longest_requests.shift();

    // First entry duration is now the smallest one
    this.lowest = this.longest_requests[0].responsetime;

    this.placeReqResData(rrr);
};

module.exports = swsLongestRequests;
