/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

// TODO Process res.statusMessage
// TODO Keep a list of most recent errors
// TODO Keep a list of most frequent errors

'use strict';

var os = require('os');
var util = require('util');

var swsUtil = require('./swsUtil');
var pathToRegexp = require('path-to-regexp');
var moment = require('moment');
var swsReqResStats = require('./swsReqResStats');
var swsCoreStats = require('./swsCoreStats');
var swsTimeline = require('./swsTimeline');
var swsAPIStats = require('./swsAPIStats');
var swsLastErrors = require('./swsLastErrors');
var swsLongestRequests = require('./swsLongestReq');


// Constructor
function swsProcessor() {

    // Name: Should be name of the service provided by this component
    this.name = 'sws';

    // Version of this component
    this.version = '';

    // This node hostname
    this.nodehostname = '';

    // Node name: there could be multiple nodes in this service
    this.nodename = '';

    // Node address: there could be multiple nodes in this service
    this.nodeaddress = '';


    // Core statistics
    this.coreStats = new swsCoreStats();

    // Timeline
    this.timeline = new swsTimeline();

    // API Stats
    this.apiStats = new swsAPIStats();

    // Last Errors
    this.lastErrors = new swsLastErrors();

    // Longest Requests
    this.longestRequests = new swsLongestRequests();
}

// Initialize
swsProcessor.prototype.init = function (swsOptions) {

    this.processOptions(swsOptions);

    this.coreStats.initialize(swsOptions);

    this.timeline.initialize(swsOptions);

    this.apiStats.initialize(swsOptions);

    // Start tick
    setInterval(this.tick, 500, this);
};

swsProcessor.prototype.processOptions = function (swsOptions) {

    if(typeof swsOptions === 'undefined') return;
    if(!swsOptions) return;

    // Set name and version
    if(swsUtil.supportedOptions.name in swsOptions) {
        this.name = swsOptions[swsUtil.supportedOptions.name];
    }

    if(swsUtil.supportedOptions.version in swsOptions) {
        this.version = swsOptions[swsUtil.supportedOptions.version];
    }

    // Set or detect hostname
    if(swsUtil.supportedOptions.nodehostname in swsOptions) {
        this.nodehostname = swsOptions[swsUtil.supportedOptions.nodehostname];
    }else{
        // Detect
        this.nodehostname = os.hostname();
    }

    // Set node name
    if(swsUtil.supportedOptions.nodename in swsOptions) {
        this.nodename = swsOptions[swsUtil.supportedOptions.nodename];
    }else{
        this.nodename = this.nodehostname;
    }

    // Set or detect node address
    if(swsUtil.supportedOptions.nodeaddress in swsOptions) {
        this.nodeaddress = swsOptions[swsUtil.supportedOptions.nodeaddress];
    }else{
        // Attempt to detect network address
        // Use first found interface name which starts from "e" ( en0, em0 ... )
        var address = null;
        var ifaces = os.networkInterfaces();
        for( var ifacename in ifaces ){
            var iface = ifaces[ifacename];
            if( !address && !iface.internal && (ifacename.charAt(0)=='e') ){
                if((iface instanceof Array) && (iface.length>0) ) {
                    address = iface[0].address;
                }
            }
        }
        this.nodeaddress = address ? address : '127.0.0.1';
    }

};

// Tick - called with specified interval to refresh timelines
swsProcessor.prototype.tick = function (that) {

    var ts = Date.now();
    var totalElapsedSec = (ts - that.coreStats.startts)/1000;

    that.coreStats.tick(ts,totalElapsedSec);

    that.timeline.tick(ts,totalElapsedSec);

    that.apiStats.tick(ts,totalElapsedSec);

};

// Collect all data for request/response pair
// TODO Support option to add arbitrary extra properties to sws request/response record
swsProcessor.prototype.collectRequestResponseData = function (res) {

    var req = res.req;

    var codeclass = swsUtil.getStatusCodeClass(res.statusCode);

    var reqresdata = {
        'url': req.url,
        'originalUrl': req.originalUrl,
        'method': req.method,
        'startts': 0,
        'endts': 0,
        'duration': 0,
        'codeclass': codeclass,
        'code': res.statusCode,
        'message': res.statusMessage,
        "name": this.name,
        "version": this.version,
        "nodehostname": this.nodehostname,
        "nodename": this.nodename,
        "nodeaddress": this.nodeaddress,
        'req': {},
        'res': {}
    };

    // Request Headers
    if ("headers" in req) {
        reqresdata.req.headers = {};
        for(var hdr in req.headers){
            reqresdata.req.headers[hdr] = req.headers[hdr];
        }
    }

    // Response Headers
    if ("_headers" in res){
        reqresdata.res.headers = {};
        for(var hdr in res['_headers']){
            reqresdata.res.headers[hdr] = res['_headers'][hdr];
        }
    }

    // Additional details from collected info per request / response pair
    if ("sws" in req) {

        reqresdata.remoteaddress = req.sws.remoteaddress;
        reqresdata.start = moment(req.sws.startts).toISOString();
        reqresdata.end = moment(req.sws.endts).toISOString();
        reqresdata.startts = req.sws.startts;
        reqresdata.endts = req.sws.endts;
        reqresdata.duration = req.sws.duration;
        reqresdata.req.clength = req.sws.req_clength;
        reqresdata.res.clength = req.sws.res_clength;
        reqresdata.route_path = req.sws.route_path;

        // Add detailed swagger API info
        reqresdata.api = {};
        reqresdata.api.path = req.sws.api_path;
        if( 'swagger' in req.sws ) reqresdata.api.swagger = req.sws.swagger;
        if( 'deprecated' in req.sws ) reqresdata.api.deprecated = req.sws.deprecated;
        if( 'operationId' in req.sws ) reqresdata.api.operationId = req.sws.operationId;
        if( 'tags' in req.sws ) reqresdata.api.tags = req.sws.tags;

        // Get API parameter values per definition in swagger spec
        var apiParams = this.apiStats.getApiOpParameterValues(req.sws.api_path,req.method,req,res);
        if(apiParams!==null){
            reqresdata.api.params = apiParams;
        }

        // TODO Support Arbitrary extra properties added to request under sws
        // So app can add any custom data to request, and it will be emitted in record

    }

    // Express parameters: req.param and req.query
    if ("params" in req) {
        reqresdata.req.params = {};
        for(var pname in req.params ){
            reqresdata.req.params[pname] = swsUtil.swsStringValue(req.params[pname]);
        }
    }

    if ("query" in req) {
        reqresdata.req.query = {};
        for(var pname in req.query ){
            reqresdata.req.query[pname] = swsUtil.swsStringValue(req.query[pname]);
        }
    }

    return reqresdata;
};


swsProcessor.prototype.getRemoteAddress = function (req ) {
    var remoteaddress = null;
    var xfwd = req.header('x-forwarded-for');
    if (xfwd) {
        var fwdaddrs = xfwd.split(','); // Could be "client IP, proxy 1 IP, proxy 2 IP"
        remoteaddress = fwdaddrs[0];
    }
    if (!remoteaddress) {
        remoteaddress = req.connection.remoteAddress;
    }
    return remoteaddress;
};

swsProcessor.prototype.processRequest = function (req, res) {

    // Placeholder for sws-specific attributes
    req.sws = {};

    // Setup sws props and pass to stats processors
    var ts = Date.now();

    var reqContentLength = 0;
    if('content-length' in req.headers) {
        reqContentLength = parseInt(req.headers['content-length']);
    }

    req.sws.startts = ts;
    req.sws.timelineid = Math.floor( ts/ this.timeline.settings.bucket_duration );
    req.sws.req_clength = reqContentLength;
    req.sws.remoteaddress = this.getRemoteAddress(req);

    // Try to match to API right away
    this.apiStats.matchRequest(req);

    // Core stats
    this.coreStats.countRequest(req, res);

    // Timeline
    this.timeline.countRequest(req, res);

    // TODO Check if needed
    this.apiStats.countRequest(req, res);
};

swsProcessor.prototype.processResponse = function (res) {

    var req = res.req;

    // Capture route path for the request, if set by router
    var route_path = '';
    if (("route" in req) && ("path" in req.route)) {
        if (("baseUrl" in req) && (req.baseUrl != undefined)) route_path = req.baseUrl;
        route_path += req.route.path;
        req.sws.route_path = route_path;
    }

    // If request was not matched to Swagger API, set API path:
    // Use route_path, if exist; if not, use originalUrl
    if(!('api_path' in req.sws)){
        req.sws.api_path = (route_path!=''?route_path:req.originalUrl);
    }

    // Pass through Core Statistics
    this.coreStats.countResponse(res);

    // Pass through Timeline
    this.timeline.countResponse(res);

    // Pass through API Statistics
    this.apiStats.countResponse(res);

    // Collect request / response record
    var reqresdata = this.collectRequestResponseData(res);

    // Pass through last errors
    this.lastErrors.processReqResData(reqresdata);

    // Pass through longest request
    this.longestRequests.processReqResData(reqresdata);

    // TODO Push Request/Response Data to Emitter(s)
};


// Get stats according to fields and params specified in query
swsProcessor.prototype.getStats = function ( query ) {

    query = typeof query !== 'undefined' ? query: {};
    query = query !== null ? query: {};

    var statfields = [];    // Default

    // Check if we have query parameter "fields"
    if ('fields' in query) {
        if (query.fields instanceof Array) {
            statfields = query.fields;
        } else {
            var fieldsstr = query.fields;
            statfields = fieldsstr.split(',');
        }
    }

    // core statistics are returned always
    var result = this.coreStats.getStats();

    // add standard properties, returned always
    result.name = this.name;
    result.version = this.version;
    result.nodehostname = this.nodehostname;
    result.nodename = this.nodename;
    result.nodeaddress = this.nodeaddress;

    var fieldMask = 0;
    for(var i=0;i<statfields.length;i++){
        var fld = statfields[i];
        if( fld in swsUtil.swsStatFields ) fieldMask |= swsUtil.swsStatFields[fld];
    }

    //console.log('Field mask:' + fieldMask.toString(2) );

    // Populate per mask
    if( fieldMask & swsUtil.swsStatFields.method )  result.method = this.coreStats.getMethodStats();
    if( fieldMask & swsUtil.swsStatFields.timeline )  result.timeline = this.timeline.getStats();
    if( fieldMask & swsUtil.swsStatFields.lasterrors )  result.lasterrors = this.lastErrors.getStats();
    if( fieldMask & swsUtil.swsStatFields.longestreq )  result.longestreq = this.longestRequests.getStats();
    if( fieldMask & swsUtil.swsStatFields.apidefs )  result.apidefs = this.apiStats.getAPIDefs();
    if( fieldMask & swsUtil.swsStatFields.apistats )  result.apistats = this.apiStats.getAPIStats();
    if( fieldMask & swsUtil.swsStatFields.apiop ) {
        if(("path" in query) && ("method" in query)) {
            result.apiop = this.apiStats.getAPIOperationStats(query.path, query.method);
        }
    }

    return result;
};

module.exports = swsProcessor;
