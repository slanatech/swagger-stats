/*
 * Created by sv2 on 3/15/17.
 * swagger-stats utilities
 */

'use strict';

var util = require('util');

// swagger-stats supported options
module.exports.supportedOptions = {

    // Name. Defaults to hostname if not specified
    name                    : "name",

    // Version
    version                 : "version",

    // Hostname. Will attempt to detect if not explicitly provided
    hostname                : "hostname",

    // IP Address. Will attempt to detect if not provided
    ip                      : "ip",

    // Swagger specification JSON document. Should be pre-validated and with resolved references. Optional.
    swaggerSpec             : "swaggerSpec",

    // Base path for swagger-stats internal APIs.
    // If specified, will be used to serve UI, stats and metrics like this:
    // /<uriPath>/ui, /<uriPath>/stats, /<uriPath>/metrics
    // overriding default /swagger-stats/ui
    uriPath                  : "uriPath",

    // Duration of timeline bucket in milliseconds, 60000 by default
    timelineBucketDuration  : "timelineBucketDuration",

    // Buckets for duration histogram metrics, in Milliseconds
    // Optional. Default value:
    // [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    // The default buckets are tailored to broadly measure API response time.
    // Most likely needs to be defined per app to account for application specifics.
    durationBuckets         : "durationBuckets",

    // Buckets for request size histogram metric, in Bytes.
    // Optional. Default value:
    // [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    // The default buckets are tailored to broadly measure API request size.
    // Most likely needs to be defined per app to account for application specifics.
    requestSizeBuckets      : "requestSizeBuckets",

    // Buckets for response size histogram metric, in Bytes
    // Optional. Default value:
    // [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    // The default buckets are tailored to broadly measure API response size.
    // Most likely needs to be defined per app to account for application specifics.
    responseSizeBuckets     : "responseSizeBuckets",

    // Apdex threshold, in milliseconds
    // 50 ms by default
    apdexThreshold          : "apdexThreshold",

    // Callback to invoke when response is finished - https://github.com/slanatech/swagger-stats/issues/5
    // Application may implement it to trace Request Response Record (RRR), which is passed as parameter
    // the following parameters are passed to this callback:
    // onResponseFinish(req,res,rrr)
    // - req - request
    // - res - response
    // - rrr - Request Response Record (RRR)
    onResponseFinish         : "onResponseFinish",

    // Enable Basic authentication: true or false. Default false.
    // Only Basic authentication is supported
    authentication           : "authentication",

    // Callback to invoke to authenticate request to /swagger-stats/stats and /swagger-stats/metrics
    // If authentication is enabled (option authentication=true),
    // Application must implement onAuthenticate to validate user credentials
    // the following parameters are passed to this callback:
    // onAuthenticate(req,username,password)
    // - req - request
    // - username - username
    // - password - password
    // callback must return true if user authenticated, false if not
    onAuthenticate           : "onAuthenticate",

    // Max Age of the session, if authentication is enabled, in seconds
    // Default is 900 seconds
    sessionMaxAge            : "sessionMaxAge",

    // ElasticSearch URL. Enables storing of request response records in Elasticsearch.
    // Default is empty (disabled).
    elasticsearch            : "elasticsearch",

    // Set to true to track only requests defined in swagger spec. Default false.
    swaggerOnly              : "swaggerOnly"

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
    nodejs_process_memory_rss_bytes: { name: 'nodejs_process_memory_rss_bytes', type: 'gauge', help: 'Node.js process resident memory (RSS) bytes '},
    nodejs_process_memory_heap_total_bytes: { name: 'nodejs_process_memory_heap_total_bytes', type: 'gauge', help: 'Node.js process memory heapTotal bytes'},
    nodejs_process_memory_heap_used_bytes: { name: 'nodejs_process_memory_heap_used_bytes', type: 'gauge', help: 'Node.js process memory heapUsed bytes'},
    nodejs_process_memory_external_bytes: { name: 'nodejs_process_memory_external_bytes', type: 'gauge', help: 'Node.js process memory external bytes'},
    nodejs_process_cpu_usage_percentage: { name: 'nodejs_process_cpu_usage_percentage', type: 'gauge', help: 'Node.js process CPU usage percentage'},

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

// returns object key values as string recursively
module.exports.swsStringRecursive = function (output, val) {
    if (typeof val === "object" && !Array.isArray(val)) {
        for (var key in val) {
            output[key] = this.swsStringRecursive(output[key], val[key]);
        }
    } else {
        output = this.swsStringValue(val);
    }

    return output;
}

// recursively cast properties of nested objects to strings
module.exports.swsCastStringR = function (val) {
    switch( typeof val ){
        case "string": return val;
        case "boolean":
        case "number":
            return val.toString();
        case "object":
            var casted = {};
            for(var prop in val){
                casted[prop] = module.exports.swsCastStringR(val[prop]);
            }
            return casted;
    }
    return '';
};


// returns string value of argument, depending on typeof
module.exports.swsNumValue = function (val) {
    var res = Number(val);
    return Number.isNaN(res) ? 0: res;
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
