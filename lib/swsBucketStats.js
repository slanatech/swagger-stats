/**
 * Bucket Statistic: count value per specified buckets.
 * Used to show histogram
 */

'use strict';

var util = require('util');
var debug = require('debug')('sws:errors');
var swsUtil = require('./swsUtil');

// Bucket Statistic: count value per specified buckets.
// buckets: array of upper bounds for buckets: [0.1,0.2,0.5,1,10,20,50]
function swsBucketStats(buckets) {

    // Total count of events that have been observed
    this.count = 0;

    // Buckets boundaries, with default bucket values
    this.buckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

    // Values
    this.values = [0,0,0,0,0,0,0,0,0,0,0,0];

    if(typeof buckets === "object" ){
        if( Array.isArray(buckets)){
            this.buckets = Array.from(buckets);
            this.values = new Array(this.buckets.length);
            this.values.fill(0);
            this.values.push(0);
        }
    }

}

swsBucketStats.prototype.countValue = function(value) {
    this.count++;
    var valuePlaced = false;
    for( var i=0; i<this.buckets.length; i++ ){
        if( !valuePlaced && (value <= this.buckets[i]) ) {
            this.values[i]++;
            valuePlaced = true;
        }
    }
    // Place value to last bucket ( <= Infinity ) if it's not placed in other bucket
    if(!valuePlaced) this.values[this.values.length - 1]++;
};

module.exports = swsBucketStats;
