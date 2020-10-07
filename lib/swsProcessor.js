/**
 * Created by sv2 on 2/18/17.
 * swagger-stats Processor. Processes requests / responses and maintains metrics
 */

'use strict';

const os = require('os');
const util = require('util');

const debug = require('debug')('sws:processor');
const debugrrr = require('debug')('sws:rrr');

const swsSettings = require('./swssettings');
const swsUtil = require('./swsUtil');
const pathToRegexp = require('path-to-regexp');
const moment = require('moment');

const swsReqResStats = require('./swsReqResStats');
const SwsSysStats = require('./swssysstats');
const SwsCoreStats = require('./swsCoreStats');
const swsErrors = require('./swsErrors');
const swsTimeline = require('./swsTimeline');
const swsAPIStats = require('./swsAPIStats');
const swsLastErrors = require('./swsLastErrors');
const swsLongestRequests = require('./swsLongestReq');
const swsElasticsearchEmitter = require('./swsElasticEmitter');

// swagger-stats Processor. Processes requests / responses and maintains metrics
class SwsProcessor {

    constructor() {

        // Timestamp when collecting statistics started
        this.startts = Date.now();

        // Name: Should be name of the service provided by this component
        this.name = 'sws';

        // Options
        //this.options = null;

        // Version of this component
        this.version = '';

        // This node hostname
        this.nodehostname = '';

        // Node name: there could be multiple nodes in this service
        this.nodename = '';

        // Node address: there could be multiple nodes in this service
        this.nodeaddress = '';

        // onResponseFinish callback, if specified in options
        this.onResponseFinish = null;

        // If set to true via options, track only API defined in swagger spec
        this.swaggerOnly = false;

        // System statistics
        this.sysStats = new SwsSysStats();

        // Core statistics
        this.coreStats = new SwsCoreStats();

        // Core Egress statistics
        this.coreEgressStats = new SwsCoreStats();

        // Timeline
        this.timeline = new swsTimeline();

        // API Stats
        this.apiStats = new swsAPIStats();

        // Errors
        this.errorsStats = new swsErrors();

        // Last Errors
        this.lastErrors = new swsLastErrors();

        // Longest Requests
        this.longestRequests = new swsLongestRequests();

        // ElasticSearch Emitter
        this.elasticsearchEmitter = new swsElasticsearchEmitter();
    }

    init() {
        this.processOptions();

        this.sysStats.initialize();

        this.coreStats.initialize();

        this.coreEgressStats.initialize('egress_');

        this.timeline.initialize(swsSettings);

        this.apiStats.initialize(swsSettings);

        this.elasticsearchEmitter.initialize(swsSettings);

        // Start tick
        this.timer = setInterval(this.tick, 200, this);
    }

    // Stop
    stop() {
        clearInterval(this.timer);
    }

    processOptions() {
        this.name = swsSettings.name;
        this.hostname = swsSettings.hostname;
        this.version = swsSettings.version;
        this.ip = swsSettings.ip;
        this.onResponseFinish = swsSettings.onResponseFinish;
        this.swaggerOnly = swsSettings.swaggerOnly;
    };

    // Tick - called with specified interval to refresh timelines
    tick(that) {
        let ts = Date.now();
        let totalElapsedSec = (ts - that.startts)/1000;
        that.sysStats.tick(ts,totalElapsedSec);
        that.coreStats.tick(ts,totalElapsedSec);
        that.timeline.tick(ts,totalElapsedSec);
        that.apiStats.tick(ts,totalElapsedSec);
        that.elasticsearchEmitter.tick(ts,totalElapsedSec);
    };

    // Collect all data for request/response pair
    // TODO Support option to add arbitrary extra properties to sws request/response record
    collectRequestResponseData(res) {

        var req = res._swsReq;

        var codeclass = swsUtil.getStatusCodeClass(res.statusCode);

        var rrr = {
            'path': req.sws.originalUrl,
            'method': req.method,
            'query' : req.method + ' ' + req.sws.originalUrl,
            'startts': 0,
            'endts': 0,
            'responsetime': 0,
            "node": {
                "name": this.name,
                "version": this.version,
                "hostname": this.hostname,
                "ip": this.ip
            },
            "http": {
                "request": {
                    "url" : req.url
                },
                "response": {
                    'code': res.statusCode,
                    'class': codeclass,
                    'phrase': res.statusMessage
                }
            }
        };

        // Request Headers
        if ("headers" in req) {
            rrr.http.request.headers = {};
            for(var hdr in req.headers){
                rrr.http.request.headers[hdr] = req.headers[hdr];
            }
            // TODO Split Cookies
        }

        // Response Headers
        var responseHeaders = res.getHeaders();
        if (responseHeaders){
            rrr.http.response.headers = responseHeaders;
        }

        // Additional details from collected info per request / response pair

        if ("sws" in req) {

            rrr.ip = req.sws.ip;
            rrr.real_ip = req.sws.real_ip;
            rrr.port = req.sws.port;

            rrr["@timestamp"] = moment(req.sws.startts).toISOString();
            //rrr.end = moment(req.sws.endts).toISOString();
            rrr.startts = req.sws.startts;
            rrr.endts = req.sws.endts;
            rrr.responsetime = req.sws.duration;
            rrr.http.request.clength = req.sws.req_clength;
            rrr.http.response.clength = req.sws.res_clength;
            rrr.http.request.route_path = req.sws.route_path;

            // Add detailed swagger API info
            rrr.api = {};
            rrr.api.path = req.sws.api_path;
            rrr.api.query = req.method + ' ' + req.sws.api_path;
            if( 'swagger' in req.sws ) rrr.api.swagger = req.sws.swagger;
            if( 'deprecated' in req.sws ) rrr.api.deprecated = req.sws.deprecated;
            if( 'operationId' in req.sws ) rrr.api.operationId = req.sws.operationId;
            if( 'tags' in req.sws ) rrr.api.tags = req.sws.tags;

            // Get API parameter values per definition in swagger spec
            var apiParams = this.apiStats.getApiOpParameterValues(req.sws.api_path,req.method,req,res);
            if(apiParams!==null){
                rrr.api.params = apiParams;
            }

            // TODO Support Arbitrary extra properties added to request under sws
            // So app can add any custom data to request, and it will be emitted in record

        }

        // Express/Koa parameters: req.params (router) and req.body (body parser)
        if (req.hasOwnProperty("params")) {
            rrr.http.request.params = {};
            swsUtil.swsStringRecursive(rrr.http.request.params, req.params);
        }

        if (req.sws && req.sws.hasOwnProperty("query")) {
            rrr.http.request.query = {};
            swsUtil.swsStringRecursive(rrr.http.request.query, req.sws.query);
        }

        if (req.hasOwnProperty("body")) {
            rrr.http.request.body = Object.assign({}, req.body);
            //swsUtil.swsStringRecursive(rrr.http.request.body, req.body);
        }

        return rrr;
    };

    getRemoteIP(req ) {
        let ip = '';
        try {
            ip = req.connection.remoteAddress;
        }catch(e){}
        return ip;
    };

    getPort(req ) {
        let p = 0;
        try{
            p = req.connection.localPort;
        }catch(e){}
        return p;
    };

    getRemoteRealIP(req ) {
        var remoteaddress = null;
        var xfwd = req.headers['x-forwarded-for'];
        if (xfwd) {
            var fwdaddrs = xfwd.split(','); // Could be "client IP, proxy 1 IP, proxy 2 IP"
            remoteaddress = fwdaddrs[0];
        }
        if (!remoteaddress) {
            remoteaddress = this.getRemoteIP(req);
        }
        return remoteaddress;
    };

    getResponseContentLength(req, res){

        if ("contentLength" in res && res['_contentLength'] !== null ){
            return res['_contentLength'];
        }

        // Try to get header
        let hcl = res.getHeader('content-length');
        if( (hcl !== undefined) && hcl && !isNaN(hcl)) {
            return parseInt(hcl);
        }

        // If this does not work, calculate using bytesWritten
        // taking into account res._header
        let initial = req.sws.initialBytesWritten || 0;
        let written = req.socket.bytesWritten - initial;
        if('_header' in res){
            const hbuf = Buffer.from(res['_header']);
            let hslen = hbuf.length;
            written -= hslen;
        }
        return written;
    }


    processRequest(req, res) {

        // Placeholder for sws-specific attributes
        req.sws = req.sws || {};

        // Setup sws props and pass to stats processors
        var ts = Date.now();

        var reqContentLength = 0;
        if('content-length' in req.headers) {
            reqContentLength = parseInt(req.headers['content-length']);
        }

        req.sws.originalUrl = req.originalUrl || req.url;
        req.sws.track = true;
        req.sws.startts = ts;
        req.sws.timelineid = Math.floor( ts/ this.timeline.settings.bucket_duration );
        req.sws.req_clength = reqContentLength;
        req.sws.ip = this.getRemoteIP(req);
        req.sws.real_ip = this.getRemoteRealIP(req);
        req.sws.port = this.getPort(req);
        req.sws.initialBytesWritten = req.socket.bytesWritten;

        // Try to match to API right away
        this.apiStats.matchRequest(req);

        // if no match, and tracking of non-swagger requests is disabled, return
        if( !req.sws.match && this.swaggerOnly){
            req.sws.track = false;
            return;
        }

        // Core stats
        this.coreStats.countRequest(req, res);

        // Timeline
        this.timeline.countRequest(req, res);

        // TODO Check if needed
        this.apiStats.countRequest(req, res);
    };

    processResponse(res) {

        let req = res._swsReq;

        req.sws = req.sws || {};

        let startts = req.sws.startts || 0;
        req.sws.endts = Date.now();
        req.sws.duration = req.sws.endts - startts;
        //let timelineid = req.sws.timelineid || 0;

        if("inflightTimer" in req.sws) {
            clearTimeout(req.sws.inflightTimer);
        }

        req.sws.res_clength = this.getResponseContentLength(req,res);

        var route_path = '';
        if( 'route_path' in req.sws ){
            // Route path could be pre-set in sws by previous handlers/hooks ( Fastify )
            route_path = req.sws.route_path;
        }
        if (("route" in req) && ("path" in req.route)) {
            // Capture route path for the request, if set by router (Express)
            if (("baseUrl" in req) && (req.baseUrl != undefined)) route_path = req.baseUrl;
            route_path += req.route.path;
            req.sws.route_path = route_path;
        }

        // If request was not matched to Swagger API, set API path:
        // Use route_path, if exist; if not, use sws.originalUrl
        if(!('api_path' in req.sws)){
            req.sws.api_path = (route_path!=''?route_path:req.sws.originalUrl);
        }

        // Pass through Core Statistics
        this.coreStats.countResponse(res);

        // Pass through Timeline
        this.timeline.countResponse(res);

        // Pass through API Statistics
        this.apiStats.countResponse(res);

        // Pass through Errors
        this.errorsStats.countResponse(res);

        // Collect request / response record
        var rrr = this.collectRequestResponseData(res);

        // Pass through last errors
        this.lastErrors.processReqResData(rrr);

        // Pass through longest request
        this.longestRequests.processReqResData(rrr);

        // Pass to app if callback is specified
        if(this.onResponseFinish !== null ){
            this.onResponseFinish(req,res,rrr);
        }

        // Push Request/Response Data to Emitter(s)
        this.elasticsearchEmitter.processRecord(rrr);

        //debugrrr('%s', JSON.stringify(rrr));
    };


    // Get stats according to fields and params specified in query
    getStats( query ) {

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

        // sys, ingress and egress core statistics are returned always
        let result = {
            startts: this.startts
        };
        result.all = this.coreStats.getStats();
        result.egress = this.coreEgressStats.getStats();
        result.sys = this.sysStats.getStats();

        // add standard properties, returned always
        result.name = this.name;
        result.version = this.version;
        result.hostname = this.hostname;
        result.ip = this.ip;
        result.apdexThreshold = swsSettings.apdexThreshold;

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
        if( fieldMask & swsUtil.swsStatFields.errors )  result.errors = this.errorsStats.getStats();

        if( fieldMask & swsUtil.swsStatFields.apiop ) {
            if(("path" in query) && ("method" in query)) {
                result.apiop = this.apiStats.getAPIOperationStats(query.path, query.method);
            }
        }

        return result;
    };

}

let swsProcessor = new SwsProcessor();
module.exports = swsProcessor;
