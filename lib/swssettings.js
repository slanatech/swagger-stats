/* swagger-stats Settings */

const os = require('os');
const path = require('path');
const swsUtil = require('./swsUtil');
const packageInfo = require('../package.json');
const debug = require('debug')('sws:settings');

/* swagger=stats settings */
class SwsSettings {

    constructor() {

        // Hostname. Will attempt to detect if not explicitly provided
        this.hostname = os.hostname();

        // Name. Defaults to hostname if not specified
        this.name = this.hostname;

        // Version
        this.version='';

        // IP Address. Will attempt to detect if not provided
        this.ip="";

        // Swagger specification JSON document. Should be pre-validated and with resolved references. Optional.
        this.swaggerSpec = null;

        // Base path for API described in swagger spec.
        // Specify this when using openapi: "3.0.0" specifications
        // For example, setting basePath='/api' with petrstore spec would match requests /api/pet/{id}, etc ...
        this.basePath = '';

        // Base path for swagger-stats internal APIs.
        // If specified, will be used to serve UI, stats and metrics like this:
        // /<uriPath>/ui, /<uriPath>/stats, /<uriPath>/metrics
        // overriding default /swagger-stats/ui
        this.uriPath= '/swagger-stats';

        // Duration of timeline bucket in milliseconds, 60000 by default
        this.timelineBucketDuration  = 60000;

        // Buckets for duration histogram metrics, in Milliseconds
        // Optional. Default value:
        // [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
        // The default buckets are tailored to broadly measure API response time.
        // Most likely needs to be defined per app to account for application specifics.
        this.durationBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

        // Buckets for request size histogram metric, in Bytes.
        // Optional. Default value:
        // [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
        // The default buckets are tailored to broadly measure API request size.
        // Most likely needs to be defined per app to account for application specifics.
        this.requestSizeBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

        // Buckets for response size histogram metric, in Bytes
        // Optional. Default value:
        // [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
        // The default buckets are tailored to broadly measure API response size.
        // Most likely needs to be defined per app to account for application specifics.
        this.responseSizeBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

        // Apdex threshold, in milliseconds
        // 25 ms by default
        this.apdexThreshold = 25;

        // Callback to invoke when response is finished - https://github.com/slanatech/swagger-stats/issues/5
        // Application may implement it to trace Request Response Record (RRR), which is passed as parameter
        // the following parameters are passed to this callback:
        // onResponseFinish(req,res,rrr)
        // - req - request
        // - res - response
        // - rrr - Request Response Record (RRR)
        this.onResponseFinish = null;

        // Enable Basic authentication: true or false. Default false.
        // Basic & custom authentication are supported
        this.authentication = false;

        // Enable Your own authentication: a function that takes
        // customAuth(req)
        // - req - request
        // must return true if user authenticated, false if not
        // eg: (req) => { if(req.user.isAdmin) {return true;} else {return false }}
        this.customAuth = null;

        // Callback to invoke to authenticate request to /swagger-stats/stats and /swagger-stats/metrics
        // If authentication is enabled (option authentication=true),
        // Application must implement onAuthenticate to validate user credentials
        // the following parameters are passed to this callback:
        // onAuthenticate(req,username,password)
        // - req - request
        // - username - username
        // - password - password
        // callback must return true if user authenticated, false if not
        this.onAuthenticate = null;

        // Max Age of the session, if authentication is enabled, in seconds
        // Default is 900 seconds
        this.sessionMaxAge = 900;

        // ElasticSearch URL. Enables storing of request response records in Elasticsearch.
        // Default is empty (disabled).
        this.elasticsearch = null;

        // Prefix for Elasticsearch index. Default is "api-"
        this.elasticsearchIndexPrefix = 'api-';

        // Username for Elasticsearch, if anonymous user is disbaled . Default is empty (disabled)
        this.elasticsearchUsername = null;

        // Password for Elasticsearch, if anonymous user is disbaled . Default is empty (disabled)
        this.elasticsearchPassword = null;

        // Elasticsearch key for SSL connection
        this.elasticsearchKey = null;

        // Elasticsearch certificat for SSL connection
        this.elasticsearchCert = null;

        // Set to true to track only requests defined in swagger spec. Default false.
        this.swaggerOnly = false;

        // Prometheus metrics prefix. Will be prepended to metric name if specified.
        this.metricsPrefix = '';

        // Enables Egress HTTP monitoring, true or false. Disabled by default.
        this.enableEgress = false;

        this.pathUI = '/swagger-stats/ui';
        this.pathDist = '/swagger-stats/dist';
        this.pathUX = '/swagger-stats/ux';
        this.pathStats = '/swagger-stats/stats';
        this.pathMetrics = '/swagger-stats/metrics';
        this.pathLogout = '/swagger-stats/logout';
    }

    init(options) {
        if(typeof options === 'undefined' || !options){
            return;
        }

        for(let op of Object.keys(this)){
            if(op in options){
                this[op] = options[op];
            }
        }

        // Set or detect node address
        if(!('ip' in options)) {
            // Attempt to detect network address
            // Use first found interface name which starts from "e" ( en0, em0 ... )
            let address = null;
            let ifaces = os.networkInterfaces();
            for( let ifacename in ifaces ){
                let iface = ifaces[ifacename];
                if( !address && !iface.internal && (ifacename.charAt(0)=='e') ){
                    if((iface instanceof Array) && (iface.length>0) ) {
                        address = iface[0].address;
                    }
                }
            }
            this.ip = address ? address : '127.0.0.1';
        }

        this.pathUI = this.uriPath+'/ui';
        this.pathDist = this.uriPath+'/dist';
        this.pathUX = this.uriPath+'/';
        this.pathStats = this.uriPath+'/stats';
        this.pathMetrics = this.uriPath+'/metrics';
        this.pathLogout = this.uriPath+'/logout';
    }

}

let swsSettings = new SwsSettings();
module.exports = swsSettings;
