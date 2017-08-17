/**
 * Prometheus Histogram metric
 *
 * https://prometheus.io/docs/concepts/metric_types/
 *
 * A histogram samples observations (usually things like request durations or response sizes) and counts them in configurable buckets.
 * It also provides a sum of all observed values.
 *
 * A histogram with a base metric name of <basename> exposes multiple time series during a scrape:
 *  cumulative counters for the observation buckets, exposed as <basename>_bucket{le="<upper inclusive bound>"}
 *  the total sum of all observed values, exposed as <basename>_sum
 *  the count of events that have been observed, exposed as <basename>_count (identical to <basename>_bucket{le="+Inf"} above)
 *
 *
 * https://www.digitalocean.com/community/tutorials/how-to-query-prometheus-on-ubuntu-14-04-part-2#step-3-—-working-with-histograms
 *
 * Internally, histograms are implemented as a group of time series that each represent the count for a given bucket
 * (e.g. "requests under 10ms", "requests under 25ms", "requests under 50ms", and so on).
 * The bucket counters are cumulative, meaning that buckets for larger values include the counts for all lower-valued buckets.
 * On each time series that is part of a histogram, the corresponding bucket is indicated by
 * the special le (less-than-or-equal) label. This adds an additional dimension to any existing dimensions you are already tracking.
 *
 */

'use strict';

var util = require('util');
var debug = require('debug')('sws:errors');
var swsUtil = require('./swsUtil');

// Prometheus Histogram metric
// boundaries: array of upper bounds for buckets: [0.1,0.2,0.5,1,10,20,50]
function swsHistogram(buckets) {

    // Total count of events that have been observed
    this.count = 0;

    // Sum of all observed values
    this.sum = 0;

    // Histogram bucket boundaries
    this.buckets = [];

    // Histogram buckets with values
    // These bucket counters are cumulative, meaning that buckets for larger values include the counts for all lower-valued buckets.
    this.cumulative_values = [];

    // Non-cumulative values -
    this.values = [];

    if(typeof buckets === "object" ){
        if( Array.isArray(buckets)){
            this.buckets = Array.from(buckets);
            this.cumulative_values = new Array(this.buckets.length);
            this.cumulative_values.fill(0);
            this.cumulative_values.push(0); // Last element will always be equal to count
            this.values = new Array(this.buckets.length);
            this.values.fill(0);
            this.values.push(0);
        }
    }

}

swsHistogram.prototype.countValue = function(value) {

    this.count++;
    this.sum += value;
    var valuePlaced = false;
    for( var i=0; i<this.buckets.length; i++ ){
        // Cumulative values
        if( value <= this.buckets[i] ) this.cumulative_values[i]++;
        // Regular histogram values
        if( !valuePlaced && (value <= this.buckets[i]) ) {
            this.values[i]++;
            valuePlaced = true;
        }
    }
    // Always increment last element of cumulative_values
    this.cumulative_values[this.cumulative_values.length - 1]++;
    // Place value to last bucket ( <= Infinity ) if it's not placed in other bucket
    if(!valuePlaced) this.values[this.values.length - 1]++;
};

module.exports = swsHistogram;
