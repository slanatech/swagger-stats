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

    // Prefix for Elasticsearch index. Default is "api-"
    elasticsearchIndexPrefix : "elasticsearchIndexPrefix",

    // Username for Elasticsearch, if anonymous user is disbaled . Default is empty (disabled)
    elasticsearchUsername    : "elasticsearchUsername",

    // Password for Elasticsearch, if anonymous user is disbaled . Default is empty (disabled)
    elasticsearchPassword    : "elasticsearchPassword",

    // Elasticsearch key for SSL connection
    elasticsearchKey      : "elasticsearchSSLKey",

    // Elasticsearch certificat for SSL connection
    elasticsearchCert     : "elasticsearchSSLCert",

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

// returns object key values as string
module.exports.swsStringRecursive = function (output, val) {
    if (typeof val === "object" && !Array.isArray(val)) {
        for (var key in val) {
            output[key] = this.swsStringValue(val[key]);
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

