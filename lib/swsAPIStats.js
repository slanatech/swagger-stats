/**
 * Created by sv2 on 2/18/17.
 * API Statistics
 */

'use strict';

var util = require('util');
var pathToRegexp = require('path-to-regexp');
var debug = require('debug')('sws:apistats');

var swsUtil = require('./swsUtil');
var swsReqResStats = require('./swsReqResStats');


// API Statistics
// Stores Definition of API based on Swagger Spec
// Stores API Statistics, for both Swagger spec-based API, as well as for detected Express APIs (route.path)
// Stores Detailed Stats for each API request
function swsAPIStats() {

    // API Base path per swagger spec
    this.basePath = '/';

    // Array of possible API path matches, populated based on Swagger spec
    // Contains regex to match URI to Swagger path
    this.apiMatchIndex = {};

    // API definition - entry per API request from swagger spec
    // Stores attributes of known Swagger APIs - description, summary, tags, parameters
    this.apidefs = {};

    // API statistics - entry per API request from swagger
    // Paths not covered by swagger will be added on demand as used
    this.apistats = {};

    // Detailed API stats
    // TODO Consider: individual timelines (?), parameters (query/path?)
    this.apidetails = {};

}

swsAPIStats.prototype.getAPIDefs = function() {
    return this.apidefs;
};

swsAPIStats.prototype.getAPIStats = function() {
    return this.apistats;
};

swsAPIStats.prototype.getAPIOperationStats = function(path,method) {

    if( (typeof path === 'undefined') || !path || (path==='')) return {};
    if( (typeof method === 'undefined') || !method || (method==='')) return {};

    var res = {};
    res[path] = {};
    res[path][method] = {};

    // api op defs
    if( (path in this.apidefs) && (method in this.apidefs[path])) {
        res[path][method].defs = this.apidefs[path][method];
    }

    // api op stats
    if( (path in this.apistats) && (method in this.apistats[path])) {
        res[path][method].stats = this.apistats[path][method];
    }

    // api op details
    if( (path in this.apidetails) && (method in this.apidetails[path])) {
        res[path][method].details = this.apidetails[path][method];
    }

    return res;
};



swsAPIStats.prototype.initBasePath = function(swaggerSpec) {
    this.basePath = swaggerSpec.basePath ? swaggerSpec.basePath : '/';
    if (this.basePath.charAt(0) !== '/') {
        this.basePath = '/' + this.basePath;
    }
    if (this.basePath.charAt(this.basePath.length - 1) !== '/') {
        this.basePath = this.basePath + '/';
    }
};

// Get full swagger Path
swsAPIStats.prototype.getFullPath = function (path) {
    var fullPath = this.basePath;
    if (path.charAt(0) === '/') {
        fullPath += path.substring(1);
    }else{
        fullPath += path;
    }
    return fullPath;
};


swsAPIStats.prototype.initialize = function(swsOptions) {

    if(typeof swsOptions === 'undefined') return;
    if(!swsOptions) return;
    if(!('swaggerSpec' in swsOptions)) return;

    var swaggerSpec = swsOptions.swaggerSpec;

    this.initBasePath(swaggerSpec);

    if(!swaggerSpec.paths) return;

    // Enumerate all paths entries
    for(var path in swaggerSpec.paths ){

        var pathDef = swaggerSpec.paths[path];

        // Create full path
        var fullPath = this.getFullPath(path);

        // Convert to express path
        var fullExpressPath = fullPath;
        //var fullExpressPath = fullPath.replace('{',':');
        //fullExpressPath = fullExpressPath.replace('}','');
        fullExpressPath = fullExpressPath.replace(/\{/g,':');
        fullExpressPath = fullExpressPath.replace(/\}/g,'');

        // Create regex for matching this API path
        var keys = [];
        var re = pathToRegexp(fullExpressPath, keys);

        // Add to API Match Index, leveraging express style matching
        this.apiMatchIndex[fullPath] = { re: re, keys: keys, expressPath: fullExpressPath, methods: {}};

        var operations = ['get','put','post','delete','options','head','patch'];
        for(var i=0;i<operations.length;i++){
            var op = operations[i];
            if(op in pathDef){
                var opDef = pathDef[op];
                var opMethod = op.toUpperCase();

                var apiOpDef = {};   // API Operation definition
                apiOpDef.swagger = true; // by definition
                apiOpDef.deprecated = ('deprecated' in opDef) ? opDef.deprecated : false;
                if( 'description' in opDef ) apiOpDef.description = opDef.description;
                if( 'operationId' in opDef ) apiOpDef.operationId = opDef.operationId;
                if( 'summary' in opDef ) apiOpDef.summary = opDef.summary;
                if( 'tags' in opDef ) apiOpDef.tags = opDef.tags;

                // Store in match index
                this.apiMatchIndex[fullPath].methods[opMethod] = apiOpDef;

                // Store in API Operation definitions. Stored separately so only definition can be retrieved
                if(!(fullPath in this.apidefs) ) this.apidefs[fullPath] = {};
                this.apidefs[fullPath][opMethod] = apiOpDef;

                // Create Stats for this API Operation; stats stored separately so only stats can be retrieved
                this.getAPIOpStats(fullPath,opMethod);

                // Create entry in apidetails
                this.getApiOpDetails(fullPath,opMethod);

                // Process parameters for this op
                this.processParameters(swaggerSpec, pathDef, opDef, fullPath, opMethod);

                debug('SWS:Initialize API:added %s %s (%s)', op, fullPath, fullExpressPath);
            }
        }
    }
};

// Process parameterss for given operation
// Take into account parameters defined as common for path (from pathDef)
swsAPIStats.prototype.processParameters = function(swaggerSpec, pathDef, opDef, fullPath, opMethod ) {

    var apidetailsEntry = this.getApiOpDetails(fullPath,opMethod);

    // Params from path
    if(('parameters' in pathDef) && (pathDef.parameters instanceof Array)) {
        var pathParams = pathDef.parameters;
        for(var j=0;j<pathParams.length;j++){
            var param = pathParams[j];
            this.processSingleParameter(apidetailsEntry,param);
        }
    }

    // Params from Op, overriding parameters from path
    if(('parameters' in opDef) && (opDef.parameters instanceof Array)){
        var opParams = opDef.parameters;
        for(var k=0;k<opParams.length;k++){
            var param = opParams[k];
            this.processSingleParameter(apidetailsEntry,param);
        }
    }

};

swsAPIStats.prototype.processSingleParameter = function(apidetailsEntry,param) {

    if( !('parameters' in apidetailsEntry) ) apidetailsEntry.parameters = {};
    var params = apidetailsEntry.parameters;

    var pname = "name" in param ? param.name : null;
    if( pname === null ) return;

    if(!(pname in params)) params[pname] = { name: pname };
    var paramEntry = params[pname];

    // Process all supported parameter properties
    for( var supportedProp in swsUtil.swsParameterProperties ){
        if(supportedProp in param){
            paramEntry[supportedProp] = param[supportedProp];
        }
    }

    // Process all vendor extensions
    for( var paramProp in param ){
        if( paramProp.startsWith('x-') ){
            paramEntry[paramProp] = param[paramProp];
        }
    }

    // Add standard stats
    paramEntry.hits = 0;
    paramEntry.misses = 0;
};

// Get or create API Operation Details
swsAPIStats.prototype.getApiOpDetails = function(path,method) {
    if(!(path in this.apidetails) ) this.apidetails[path] = {};
    if(!(method in this.apidetails[path]) ) this.apidetails[path][method] = {};
    return this.apidetails[path][method];
};

// Get or create API Operation Stats
swsAPIStats.prototype.getAPIOpStats = function( path, method ) {
    if( !(path in this.apistats)) this.apistats[path] = {};
    if( !(method in this.apistats[path])) this.apistats[path][method] = new swsReqResStats();
    return this.apistats[path][method];
};

// Update and stats per tick
swsAPIStats.prototype.tick = function (ts,totalElapsedSec) {
    // Update Rates in apistats
    for( var path in this.apistats ) {
        for( var method in this.apistats[path] ) {
            this.apistats[path][method].updateRates(totalElapsedSec);
        }
    }
};

// Extract path parameter values based on successful path match results
swsAPIStats.prototype.extractPathParams = function (matchResult,keys) {
    var pathParams = {};
    for(var i=0;i<keys.length;i++){
        if('name' in keys[i] ) {
            var vidx = i + 1; // first element in match result is URI
            if( vidx < matchResult.length ) {
                pathParams[keys[i].name] = swsUtil.swsStringValue(matchResult[vidx]);
            }
        }
    }
    return pathParams;
};

// Try to match request to API to known API definition
swsAPIStats.prototype.matchRequest = function (req) {
    var url = req.originalUrl;
    // Strip query string parameters
    var qidx = url.indexOf('?');
    if(qidx!=-1) {
        url = url.substring(0,qidx);
    }
    for (var swPath in this.apiMatchIndex) {
        var matchResult = this.apiMatchIndex[swPath].re.exec(url);
        if (matchResult) {
            if (req.method in this.apiMatchIndex[swPath].methods) {
                var apiInfo = this.apiMatchIndex[swPath].methods[req.method];
                req.sws.api_path = swPath;
                req.sws.swagger = true;
                // Extract path parameters from match result
                req.sws.path_params = this.extractPathParams(matchResult,this.apiMatchIndex[swPath].keys);
                // When matched, attach only subset of information to request,
                // so we don't overload reqresinfo with repeated description, etc
                if ('deprecated' in apiInfo) req.sws.deprecated = apiInfo.deprecated;
                if ('operationId' in apiInfo) req.sws.tags = apiInfo.tags;
                if ('tags' in apiInfo) req.sws.tags = apiInfo.tags;
            }
        }
    }
};


// Count Api Operation Parameters Statistics
// Only count hits and misses
// Hit: parameter present
// Miss: mandatory parameter is missing
// Only supported path and query parameters
swsAPIStats.prototype.countParametersStats = function (path, method, req, res) {

    if(!('swagger' in req.sws) || !req.sws.swagger ) return; // Only counting for swagger-defined API Ops

    var apiOpDetails = this.getApiOpDetails(path, method);

    if( !('parameters' in apiOpDetails) ) return; // Only counting if parameters spec is there

    for( var pname in apiOpDetails.parameters ){

        var param = apiOpDetails.parameters[pname];
        var isRrequired = 'required' in param ? param.required : false;

        if( 'in' in param ){
            switch(param.in){
                case "path":
                    // Path param is always there, or request will not be matched
                    param.hits++;
                    break;
                case "query":
                    if( ('query' in req) && (pname in req.query) ){
                        param.hits++;
                    }else if(isRrequired){
                        param.misses++;
                    }
                    break;
            }
        }
    }

};


// Get Api Operation Parameter Values per specification
// Only supported path and query parameters
swsAPIStats.prototype.getApiOpParameterValues = function (path, method, req, res) {

    if(!('swagger' in req.sws) || !req.sws.swagger ) return null; // Only for swagger-defined API Ops

    var apiOpDetails = this.getApiOpDetails(path, method);

    if( !('parameters' in apiOpDetails) ) return null; // Only if parameters spec is there

    var paramValues = {};

    for( var pname in apiOpDetails.parameters ){

        var param = apiOpDetails.parameters[pname];

        if( 'in' in param ){
            switch(param.in){
                case "path":
                    if(('path_params' in req.sws) && (pname in req.sws.path_params)) {
                        paramValues[pname] = swsUtil.swsStringValue(req.sws.path_params[pname]);
                    }
                    break;

                case "query":
                    if(('query' in req) && (pname in req.query)) {
                        paramValues[pname] = swsUtil.swsStringValue(req.query[pname]);
                    }
                    break;
            }
        }
    }
    return paramValues;
};

// Count request
swsAPIStats.prototype.countRequest = function (req, res) {

    // NOOP //

};

// Count finished response
swsAPIStats.prototype.countResponse = function (res) {

    // TODO
    var req = res.req;

    // Rely on data attached to request in previously in sws ???
    if(!("sws" in req)) {
        // TODO report warning
        return;
    }

    var codeclass = swsUtil.getStatusCodeClass(res.statusCode);

    // Only intersted in updating stats here
    var apiOpStats = this.getAPIOpStats(req.sws.api_path,req.method);

    // do both count request and count response in API stats, as only at this time we know path so can map request / response to API entry
    apiOpStats.countRequest(req.sws.req_clength);
    apiOpStats.countResponse(res.statusCode,codeclass,req.sws.duration,req.sws.res_clength);

    this.countParametersStats(req.sws.api_path,req.method, req, res );

};

module.exports = swsAPIStats;
