/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

'use strict';

var util = require('util');

var ReqStats = require('./swsReqstats');

// TODO Process res.statusMessage
// TODO Keep a list of most recent errors
// TODO Keep a list of most frequent errors

// Constructor
function swsAPIData() {
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

  // Last 100 errors
  this.last_errors = [];

  // TODO API statistics - entry per API request from swagger
  // All requestst - any URL- or include to above
}


// Count request
swsAPIData.prototype.countRequest = function(req,res){
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


// Return response status code class
swsAPIData.prototype.getStatusCodeClass= function(code) {
  if(code<200) return "info";
  if(code<300) return "success";
  if(code<400) return "redirect";
  if(code<500) return "client_error";
  return "server_error";
};

// Count finished response
swsAPIData.prototype.countResponse = function(res){
  this.active--;

  // Determine status code type
  var codeclass = this.getStatusCodeClass(res.statusCode);
  this.all[codeclass]++;

  var req = res.req;

  // Determine duration
  var startts = 0;
  var duration = 0;
  if("swaggerstats" in req){
    startts =  req.swaggerstats.startts;
    var endts = Date.now();
    req['swaggerstats'].endts = endts;
    duration = endts - startts;
    req['swaggerstats'].duration = duration;
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
    mstat[codeclass]++;
    if( duration > 0){
      mstat.total_time += duration;
      mstat.avg_time = mstat.total_time / mstat.requests;
    }
  }

};

// Collect all data for request/response pair
swsAPIData.prototype.collectRequestResponseData = function(res) {
    var req = res.req;
    var codeclass = this.getStatusCodeClass(res.statusCode);
    var reqresdata = { 'url': req.url,
        'originalUrl': req.originalUrl,
        'method': req.method,
        'startts':0,
        'endts':0,
        'duration':0,
        'codeclass':codeclass,
        'code':res.statusCode,
        'message':res.statusMessage };
    if("swaggerstats" in req){
        reqresdata.startts = req.swaggerstats.startts;
        reqresdata.endts = req.swaggerstats.endts;
        reqresdata.duration = req.swaggerstats.duration;
    }
    // TODO Headers
    // TODO Body
    // TODO Parameters
    // TODO Source IP address
    return reqresdata;
};

swsAPIData.prototype.processRequest = function(req,res){
    this.countRequest(req,res);
};

swsAPIData.prototype.processResponse = function(res){
    this.countResponse(res);

    // Collect data about request / response
    var reqresdata = this.collectRequestResponseData(res);

    // Store information about last errors
    if(reqresdata.codeclass=="client_error" || reqresdata.codeclass=="server_error"){
        this.last_errors.push(reqresdata);
        // TODO Clean up if more then allowed
        if(this.last_errors.length>100){
            this.last_errors.shift();
        }
    }

    // TODO Push Request/Response Data to tracker
};


module.exports = swsAPIData;
