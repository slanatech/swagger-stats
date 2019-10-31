/**
 * Created by sv2 on 2/18/17.
 * API usage statistics data
 */

'use strict';

const util = require('util');
const debug = require('debug')('sws:sysstats');
const promClient = require("prom-client");
const swsSettings = require('./swssettings');
const swsMetrics = require('./swsmetrics');
const swsUtil = require('./swsUtil');

/* swagger=stats Prometheus metrics */
class SwsSysStats {

    constructor() {
        // System statistics
        this.sys = null;

        // CPU
        this.startTime  = null;
        this.startUsage = null;

        // Array with last 5 hrtime / cpuusage, to calculate CPU usage during the last second sliding window ( 5 ticks )
        this.startTimeAndUsage = null;

        // Prometheus metrics
        this.promClientMetrics = {};
    }

    initialize(){
        // System statistics
        this.sys = {
            rss: 0,
            heapTotal: 0,
            heapUsed: 0,
            external: 0,
            cpu: 0,
            lag: 0,
            maxlag: 0
        };

        // CPU
        this.startTime  = process.hrtime();
        this.startUsage = process.cpuUsage();

        // Array with last 5 hrtime / cpuusage, to calculate CPU usage during the last second sliding window ( 5 ticks )
        this.startTimeAndUsage = [
            { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() },
            { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() },
            { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() },
            { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() },
            { hrtime: process.hrtime(), cpuUsage: process.cpuUsage() }
        ];

        this.promClientMetrics = swsMetrics.getPrometheusMetrics(swsSettings.metricsPrefix,swsMetrics.systemMetricsDefs);
    }

    setEventLoopLag(start, sys) {
        const delta = process.hrtime(start);
        const nanosec = delta[0] * 1e9 + delta[1];
        const mseconds = nanosec / 1e6;
        sys.lag = mseconds;
        if( mseconds > sys.maxlag ) {
            sys.maxlag = mseconds;
        }
    }

    getStats() {
        return this.sys;
    }

    tick(ts,totalElapsedSec) {
        // System stats
        this.calculateSystemStats(ts,totalElapsedSec);
    };

    // Calculate and store system statistics
    calculateSystemStats(ts,totalElapsedSec) {
        // Memory
        let memUsage = process.memoryUsage();

        // See https://stackoverflow.com/questions/12023359/what-do-the-return-values-of-node-js-process-memoryusage-stand-for
        // #22 Handle properly if any property is missing
        this.sys.rss = 'rss' in memUsage ? memUsage.rss : 0;
        this.sys.heapTotal = 'heapTotal' in memUsage ? memUsage.heapTotal : 0;
        this.sys.heapUsed = 'heapUsed' in memUsage ? memUsage.heapUsed : 0;
        this.sys.external = 'external' in memUsage ? memUsage.external : 0;

        let startTU = this.startTimeAndUsage.shift();

        let cpuPercent = swsUtil.swsCPUUsagePct(startTU.hrtime, startTU.cpuUsage);

        let startTime  = process.hrtime();
        setImmediate(this.setEventLoopLag, startTime, this.sys);

        let startUsage = process.cpuUsage();
        this.startTimeAndUsage.push( { hrtime: startTime, cpuUsage: startUsage } );

        this.sys.cpu = cpuPercent;

        // Update prom-client metrics
        this.promClientMetrics.nodejs_process_memory_rss_bytes.set(this.sys.rss);
        this.promClientMetrics.nodejs_process_memory_heap_total_bytes.set(this.sys.heapTotal);
        this.promClientMetrics.nodejs_process_memory_heap_used_bytes.set(this.sys.heapUsed);
        this.promClientMetrics.nodejs_process_memory_external_bytes.set(this.sys.external);
        this.promClientMetrics.nodejs_process_cpu_usage_percentage.set(this.sys.cpu);
    };

}

module.exports = SwsSysStats;
