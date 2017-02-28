/**
 * Created by sv2 on 2/18/17.
 * API usage statistics collection
 */

'use strict';

var util = require('util');

var ReqStats = require('./swsReqstats');

// TODO Process res.statusMessage
// TODO Keep a list of most recent errors
// TODO Keep a list of most frequent errors


// Constructor
function swsAPIStats() {
  // Timestamp when collecting statistics started
  this.startts = Date.now();

  // Statistics for all requests
  this.all = new ReqStats();

  // Number of requests in processing: response is not sent yet
  this.active = 0;

  // Statistics for requests by method
  // Initialized with most frequent ones, other methods will be added on demand if actually used
  this.method = {
    'GET':      new ReqStats(),
    'POST':     new ReqStats(),
    'PUT':      new ReqStats(),
    'DELETE':   new ReqStats()
  };

  // TODO Timeline of request statistics, one entry per minute for past 60 minutes
  // Hash by timestamp divided by 60 seconds, so we can match finished response to bucket
  this.timeline = {};

  // TODO API statistics - entry per API request from swagger
  // All requestst - any URL- or include to above
}


// Count request
swsAPIStats.prototype.countRequest = function(req,res){
  this.active++;
  this.all.requests++;

  // Store context in request
  req.swaggerstats = {
    startts: Date.now()
  };

  // Determine method
  var method = req.method;
  if(!(method in this.method)){
    this.method[method] = new ReqStats();
  }
  this.method[method].requests++;

};


// Return response status code type
swsAPIStats.prototype.getStatusCodeType = function(code) {
  if(code<200) return "info";
  if(code<300) return "success";
  if(code<400) return "redirect";
  if(code<500) return "client_error";
  return "server_error";
};

// Count finished response
swsAPIStats.prototype.countResponse = function(res){
  this.active--;

  // Determine status code type
  var codetype = this.getStatusCodeType(res.statusCode);
  this.all[codetype]++;

  var req = res.req;

  // Determine duration
  var startts = 0;
  var duration = 0;
  if("swaggerstats" in req){
    startts =  req.swaggerstats.startts;
    var endts = Date.now();
    duration = endts - startts;
  }

  // update timing
  if( duration > 0){
    this.all.total_time += duration;
    this.all.avg_time = this.all.total_time / this.all.requests;
  }

  // Determine method and update method-specific stats
  var method = req.method;
  if(method in this.method){
    var mstat = this.method[method];
    mstat[codetype]++;
    if( duration > 0){
      mstat.total_time += duration;
      mstat.avg_time = mstat.total_time / mstat.requests;
    }
  }

}


/*

// API usage statistics collection
class APIStats {

    constructor (){

        // Timestamp when collecting statistics started
        this.startts = Date.now();

        // Statistics for all requests
        this.all = new ReqStats();

        // Number of requests in processing: response is not sent yet
        this.active = 0;

        // Statistics for requests by method
        // Initialized with most frequent ones, other methods will be added on demand if actually used
        this.method = {
            'GET':      new ReqStats(),
            'POST':     new ReqStats(),
            'PUT':      new ReqStats(),
            'DELETE':   new ReqStats(),
        };

        // TODO Timeline of request statistics, one entry per minute for past 60 minutes
        // Hash by timestamp divided by 60 seconds, so we can match finished response to bucket
        this.timeline = {};

        // TODO API statistics - entry per API request from swagger
        // All requestst - any URL- or include to above
    }

    // Count request
    countRequest(req,res){
        this.active++;
        this.all.requests++;

        // Store context in request
        req.swaggerstats = {
            startts: Date.now()
        };

        // Determine method
        var method = req.method;
        if(!(method in this.method)){
            this.method[method] = new ReqStats();
        }
        this.method[method].requests++;

    }

    // Return response status code type
    getStatusCodeType(code) {
        if(code<200) return "info";
        if(code<300) return "success";
        if(code<400) return "redirect";
        if(code<500) return "client_errror";
        return "server_errror";
    }

    // Count finished response
    countResponse(res){
        this.active--;

        // Determine status code type
        var codetype = this.getStatusCodeType(res.statusCode);
        this.all[codetype]++;

        var req = res.req;

        // Determine duration
        var startts = 0;
        var duration = 0;
        if("swaggerstats" in req){
            startts =  req.swaggerstats.startts;
            var endts = Date.now();
            duration = endts - startts;
        }

        // update timing
        if( duration > 0){
            this.all.total_time += duration;
            this.all.avg_time = this.all.total_time / this.all.requests;
        }

        // Determine method and update method-specific stats
        var method = req.method;
        if(method in this.method){
            var mstat = this.method[method];
            mstat[codetype]++;
            if( duration > 0){
                mstat.total_time += duration;
                mstat.avg_time = mstat.total_time / mstat.requests;
            }
        }

    }

}
*/

module.exports = swsAPIStats;
