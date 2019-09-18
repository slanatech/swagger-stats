/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

'use strict';

const util = require('util');
const debug = require('debug')('sws:corestats');
const promClient = require("prom-client");
const swsSettings = require('./swssettings');
const swsMetrics = require('./swsmetrics');
const swsUtil = require('./swsUtil');
const SwsReqResStats = require('./swsReqResStats');


/* swagger=stats Prometheus metrics */
class SwsCoreStats {

    constructor(){

        // Statistics for all requests
        this.all = null;

        // Statistics for requests by method
        // Initialized with most frequent ones, other methods will be added on demand if actually used
        this.method = null;

        // Additional prefix for prometheus metrics. Used if this coreStats instance
        // plays special role, i.e. count stats for egress
        this.metricsRolePrefix = '';

        // Prometheus metrics
        this.promClientMetrics = {};
    }

    // Initialize
    initialize(metricsRolePrefix) {

        this.metricsRolePrefix = metricsRolePrefix || '';

        // Statistics for all requests
        this.all = new SwsReqResStats(swsSettings.apdexThreshold);

        // Statistics for requests by method
        // Initialized with most frequent ones, other methods will be added on demand if actually used
        this.method = {
            'GET': new SwsReqResStats(swsSettings.apdexThreshold),
            'POST': new SwsReqResStats(swsSettings.apdexThreshold),
            'PUT': new SwsReqResStats(swsSettings.apdexThreshold),
            'DELETE': new SwsReqResStats(swsSettings.apdexThreshold)
        };

        // metrics
        swsMetrics.clearPrometheusMetrics(this.promClientMetrics);

        let prefix = swsSettings.metricsPrefix + this.metricsRolePrefix;
        this.promClientMetrics = swsMetrics.getPrometheusMetrics(prefix,swsMetrics.coreMetricsDefs);
    };

    getStats() {
        return this.all;
    };

    getMethodStats() {
        return this.method;
    };

    // Update timeline and stats per tick
    tick(ts,totalElapsedSec) {
        // Rates
        this.all.updateRates(totalElapsedSec);
        for( let mname of Object.keys(this.method)) {
            this.method[mname].updateRates(totalElapsedSec);
        }
    };

    // Count request
    countRequest(req) {

        // Count in all
        this.all.countRequest(req.sws.req_clength);

        // Count by method
        var method = req.method;
        if (!(method in this.method)) {
            this.method[method] = new SwsReqResStats();
        }
        this.method[method].countRequest(req.sws.req_clength);

        // Update prom-client metrics
        this.promClientMetrics.api_all_request_total.inc();
        this.promClientMetrics.api_all_request_in_processing_total.inc();
        req.sws.inflightTimer = setTimeout(function() {
            this.promClientMetrics.api_all_request_in_processing_total.dec();
        }.bind(this), 250000);
    };

    countResponse (res) {

        var req = res._swsReq;

        // Defaults
        let duration = req.sws.duration || 0;
        let resContentLength = req.sws.res_clength || 0;
        // let timelineid = req.sws.timelineid || 0;
        // let path = req.sws.api_path || req.sws.originalUrl || req.originalUrl;

        /*
        if("sws" in req) {
            startts = req.sws.startts;
            timelineid = req.sws.timelineid;
            var endts = Date.now();
            req['sws'].endts = endts;
            duration = endts - startts;
            req['sws'].duration = duration;
            req['sws'].res_clength = resContentLength;
            path = req['sws'].api_path;
            clearTimeout(req.sws.inflightTimer);
        }
        */

        // Determine status code type
        var codeclass = swsUtil.getStatusCodeClass(res.statusCode);

        // update counts for all requests
        this.all.countResponse(res.statusCode,codeclass,duration,resContentLength);

        // Update method-specific stats
        var method = req.method;
        if (method in this.method) {
            var mstat = this.method[method];
            mstat.countResponse(res.statusCode,codeclass,duration,resContentLength);
        }

        // Update Prometheus metrics
        switch(codeclass){
            case "success":
                this.promClientMetrics.api_all_success_total.inc();
                break;
            case "redirect":
                // NOOP //
                break;
            case "client_error":
                this.promClientMetrics.api_all_errors_total.inc();
                this.promClientMetrics.api_all_client_error_total.inc();
                break;
            case "server_error":
                this.promClientMetrics.api_all_errors_total.inc();
                this.promClientMetrics.api_all_server_error_total.inc();
                break;
        }
        this.promClientMetrics.api_all_request_in_processing_total.dec();
    };
}

module.exports = SwsCoreStats;
