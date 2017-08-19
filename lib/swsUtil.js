/*
 * Created by sv2 on 3/15/17.
 * swagger-stats utilities
 */

'use strict';

var util = require('util');

// swagger-stats supported options
module.exports.supportedOptions = {
    name                    : "name",                   // Name. Defaults to hostname if not specified.
    version                 : "version",                // Version
    hostname                : "hostname",               // Hostname. Will attempt to detect if not explicitly provided
    ip                      : "ip",                     // IP Address. Will attempt to detect if not provided
    swaggerSpec             : "swaggerSpec",            // Swagger specification JSON document. Should be pre-validated and with resolved references
    timelineBucketDuration  : "timelineBucketDuration"  // Duration of timeline bucket in milliseconds, 60000 by default
};

// Return response status code class
module.exports.getStatusCodeClass = function (code) {
    if (code < 200) return "info";
    if (code < 300) return "success";
    if (code < 400) return "redirect";
    if (code < 500) return "client_error";
    return "server_error";
};

module.exports.isError = function (code) {
    return (code >= 400);
};

// Supported Stat Fields with masks
module.exports.swsStatFields = {
    method      : 1 << 0,
    timeline    : 1 << 1,
    lasterrors  : 1 << 2,
    longestreq  : 1 << 3,
    apidefs     : 1 << 4,
    apistats    : 1 << 5,
    apiop       : 1 << 6,
    errors      : 1 << 7,
    all         : parseInt('11111111', 2),
    "*"         : parseInt('11111111', 2)
};


// Supported properties in Swagger Parameter object
module.exports.swsParameterProperties = {
    name            : "name",
    in              : "in",
    description     : "description",
    required        : "required",
  /*schema          : "schema",*/           // We will not be copying schema for "body" parameters
    type            : "type",
    format          : "format",
    allowEmptyValue : "allowEmptyValue",
    items           : "items",              // ????
    collectionFormat: "collectionFormat",
    default         : "default",
    maximum         : "maximum",
    exclusiveMaximum: "exclusiveMaximum",
    minimum         : "minimum",
    exclusiveMinimum: "exclusiveMinimum",
    maxLength       : "maxLength",
    minLength       : "minLength",
    pattern         : "pattern",
    maxItems        : "maxItems",
    minItems        : "minItems",
    uniqueItems     : "uniqueItems",
    enum            : "enum",
    multipleOf      : "multipleOf"
};

// METRICS ////////////////////////////////////////////////////////////// //

module.exports.swsMetrics = {

    // TOP level counters for all requests / responses, no labels
    api_all_request_total: { name: 'api_all_request_total', type: 'counter', help: 'The total number of all API requests received'},
    api_all_success_total: { name: 'api_all_success_total', type: 'counter', help: 'The total number of all API requests with success response'},
    api_all_errors_total: { name: 'api_all_errors_total', type: 'counter', help: 'The total number of all API requests with error response'},
    api_all_client_error_total: { name: 'api_all_client_error_total', type: 'counter', help: 'The total number of all API requests with client error response'},
    api_all_server_error_total: { name: 'api_all_server_error_total', type: 'counter', help: 'The total number of all API requests with server error response'},
    api_all_request_in_processing_total: { name: 'api_all_request_in_processing_total', type: 'gauge', help: 'The total number of all API requests currently in processing (no response yet)'},

    // System metrics for node process
    api_sys_node_memory_rss_bytes: { name: 'api_sys_node_memory_rss_bytes', type: 'gauge', help: 'Node process memory usage RSS bytes'},
    api_sys_node_memory_heapTotal_bytes: { name: 'api_sys_node_memory_heapTotal_bytes', type: 'gauge', help: 'Node process memory usage heapTotal bytes'},
    api_sys_node_memory_heapUsed_bytes: { name: 'api_sys_node_memory_heapUsed_bytes', type: 'gauge', help: 'Node process memory usage heapUsed bytes'},
    api_sys_node_memory_external_bytes: { name: 'api_sys_node_memory_external_bytes', type: 'gauge', help: 'Node process memory usage external bytes'},
    api_sys_node_cpu_usage_percentage: { name: 'api_sys_node_cpu_usage_percentage', type: 'gauge', help: 'Node process CPU usage percentage'},

    // API Operation counters, labeled with method, path and code
    api_request_total: { name: 'api_request_total', type: 'counter', help: 'The total number of all API requests'},

    // DISABLED API Operation counters, labeled with method, path and codeclass
    //api_request_codeclass_total: { name: 'api_request_codeclass_total', type: 'counter', help: 'The total number of all API requests by response code class'},

    // API request duration histogram, labeled with method, path and code
    api_request_duration_milliseconds: { name: 'api_request_duration_milliseconds', type: 'histogram', help: 'API requests duration'},

    // API request size histogram, labeled with method, path and code
    api_request_size_bytes: { name: 'api_request_size_bytes', type: 'histogram', help: 'API requests size'},

    // API response size histogram, labeled with method, path and code
    api_response_size_bytes: { name: 'api_response_size_bytes', type: 'histogram', help: 'API requests size'}
};

module.exports.swsMetricStart = function(metric){
    if(!(metric in module.exports.swsMetrics )) return '';
    var m = module.exports.swsMetrics[metric];
    var d = '# HELP '+m.name+' '+m.help+'\n';
    d += '# TYPE '+m.name+' '+m.type+'\n';
    return d;
};

module.exports.swsMetricValue = function(metric, value, labels, suffix ){
    if(!(metric in module.exports.swsMetrics )) return '';
    var m = module.exports.swsMetrics[metric];
    var l= '';

    // TODO Consider optimizing
    for (var label in labels) {
        if (l !== '') l += ',';
        l += label+'="'+labels[label]+'"';
    }

    var d = m.name;
    d += (typeof suffix !== 'undefined' ? suffix : '');
    d += (l !== '' ? '{'+l+'} ' : ' ');
    d += value +'\n';
    return d;
};

module.exports.swsMetricSingleValue = function(metric, value, labels ) {
    var d = module.exports.swsMetricStart(metric);
    d += module.exports.swsMetricValue(metric,value, labels);
    return d;
};

// ////////////////////////////////////////////////////////////////////// //

// returns string value of argument, depending on typeof
module.exports.swsStringValue = function (val) {
    switch( typeof val ){
        case "string": return val;
        case "boolean":
        case "number":
            return val.toString();
        case "object":
            if(val === null) return '';
            var res = '';
            try {
                res = JSON.stringify(val);
            }catch(e){
                res = '';
            }
            return res;
    }
    return '';
};

// Calculate CPU Usage Percentage
module.exports.swsCPUUsagePct = function(starthrtime, startusage) {
    // On CPU - see
    // https://github.com/nodejs/node/pull/6157
    var elapTime = process.hrtime(starthrtime);
    const NS_PER_SEC = 1e9;
    var elapsedns = elapTime[0] * NS_PER_SEC + elapTime[1]; // nanoseconds
    var elapsedmcs = elapsedns/1000;    // microseconds
    var elapUsage = process.cpuUsage(startusage); // microseconds
    var cpuPercent = (100 * (elapUsage.user + elapUsage.system) / elapsedmcs );
    return cpuPercent;
};

module.exports.swsEmbeddedUIMarkup = '<!DOCTYPE html><html><head><title>Swagger Stats UI</title><link href="dist/css/sws.min.css" rel="stylesheet"></head>\
                <body>\
                <div id="SWSUI"></div>\
                    <script src="dist/js/sws.min.js"></script>\
                    <script>\
                    $(document).ready(function(){$("#SWSUI").swaggerstatsui({});});\
                    </script>\
                </body>\
                </html>';
