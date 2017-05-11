/*
 * Created by sv2 on 3/9/17.
 *
 * SWS Test utilities
 */

'use strict';

var swsUtil = require('../lib/swsUtil');
var debug = require('debug')('swstest:utils');


module.exports.getApiBasePath = function(swaggerSpec){
    var basePath = swaggerSpec.basePath ? swaggerSpec.basePath : '/';
    if (basePath.charAt(0) !== '/') {
        basePath = '/' + basePath;
    }
    if (basePath.charAt(basePath.length - 1) !== '/') {
        basePath = basePath + '/';
    }
    return basePath;
};


module.exports.getApiFullPath = function(basepath, path){
    var fullPath = basepath;
    if (path.charAt(0) === '/') {
        fullPath += path.substring(1);
    }else{
        fullPath += path;
    }
    return fullPath;
};


// Extract all parameterss for given API operation
module.exports.extractApiOpParameters = function(swaggerSpec, pathDef, opDef) {

    var apiOpParams = {};

    // Params from path
    if(('parameters' in pathDef) && (pathDef.parameters instanceof Array)) {
        var pathParams = pathDef.parameters;
        for(var j=0;j<pathParams.length;j++){
            var param = pathParams[j];
            processSingleParameter(apiOpParams,param);
        }
    }

    // Params from Op, overriding parameters from path
    if(('parameters' in opDef) && (opDef.parameters instanceof Array)){
        var opParams = opDef.parameters;
        for(var k=0;k<opParams.length;k++){
            var param = opParams[k];
            processSingleParameter(apiOpParams,param);
        }
    }

    return apiOpParams;

};

function processSingleParameter(apiOpParams,param) {

    var pname = "name" in param ? param.name : null;
    if( pname === null ) return;

    if(!(pname in apiOpParams)) apiOpParams[pname] = { name: pname };
    var paramEntry = apiOpParams[pname];

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
};


// generate everything needed to invoke API operation
module.exports.generateApiOpCallDef = function(swaggerSpec, pathDef, opDef, op, fullPath, opParams) {

    var callDef = {
        method: op.toLowerCase(),
        uri: '',
        query: {}
    };

    // First, generate URI substituting path parameters
    var callURI = fullPath;
    for(var pname in opParams){
        var pDef = opParams[pname];
        if( ('in' in pDef) && (pDef.in == 'path') ){
            var pVal = 'abcde'; // string by default
            if('type' in pDef){
                switch(pDef.type){
                    case 'integer':
                    case 'number':
                        pVal = 12345;
                        break;
                    case 'boolean':
                        pVal = true;
                        break;
                }
            }
            // Substitute
            var pPattern = '{'+pname+'}';
            callURI = callURI.replace(pPattern,pVal.toString());
        }
    }
    callDef.uri = callURI;

    // TODO Query

    return callDef;
};

// Generate list with call definition for each API Operation
module.exports.generateApiOpList = function(swaggerSpec){

    var basePath = module.exports.getApiBasePath(swaggerSpec);
    debug('BasePath: %s', basePath);

    var apiOperationsList = [];

    for (var path in swaggerSpec.paths) {

        var pathDef = swaggerSpec.paths[path];

        // Create full path
        var fullPath = module.exports.getApiFullPath(basePath, path);
        debug('fullPath: %s', fullPath);

        var operations = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

        for (var i = 0; i < operations.length; i++) {
            var op = operations[i];
            if (op in pathDef) {
                var opDef = pathDef[op];
                var opMethod = op.toUpperCase();

                debug('API OP: %s %s', opMethod, path);

                // Extract all parameters
                var opParams = module.exports.extractApiOpParameters(swaggerSpec, pathDef, opDef);
                debug('Parameters: %s', JSON.stringify(opParams));

                // Call Definition
                var opCallDef = module.exports.generateApiOpCallDef(swaggerSpec, pathDef, opDef, op, fullPath, opParams);
                debug('opCallDef: %s', JSON.stringify(opCallDef));

                // Add call definition to the list
                var label = opMethod + ' ' + path;
                apiOperationsList.push({label:label, path:fullPath, method: opMethod, opCallDef:opCallDef});
            }
        }
    }
    return apiOperationsList;
};


module.exports.getRandomArbitrary = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
};

// HTTP Status Codes utilities //

module.exports.httpStatusCodes = {
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        203: 'Non-Authoritative Information',
        204: 'No Content',
        205: 'Reset Content',
        206: 'Partial Content',
        207: 'Multi Status',
        208: 'Already Reported',
        226: 'IM Used',
        300: 'Multiple Choices',
        301: 'Moved Permanently',
        302: 'Found',
        303: 'See Other',
        304: 'Not Modified',
        305: 'Use Proxy',
        306: 'Switch Proxy',
        307: 'Temporary Redirect',
        308: 'Permanent Redirect',
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Time-out',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Request Entity Too Large',
        414: 'Request-URI Too Large',
        415: 'Unsupported Media Type',
        416: 'Requested Range not Satisfiable',
        417: 'Expectation Failed',
        418: 'I\'m a teapot',
        421: 'Misdirected Request',
        422: 'Unprocessable Entity',
        423: 'Locked',
        424: 'Failed Dependency',
        426: 'Upgrade Required',
        428: 'Precondition Required',
        429: 'Too Many Requests',
        431: 'Request Header Fields Too Large',
        451: 'Unavailable For Legal Reasons',
        500: 'Internal Server Error',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Time-out',
        505: 'HTTP Version not Supported',
        506: 'Variant Also Negotiates',
        507: 'Insufficient Storage',
        508: 'Loop Detected',
        510: 'Not Extended',
        511: 'Network Authentication Required'
};


module.exports.httpStatuses = [];
module.exports.httpStatusesRandom = [];
for(var i=0;i<50;i++){
    module.exports.httpStatusesRandom.push('200');  // Increase probability of 200 for random generation
}
for(var sc in module.exports.httpStatusCodes) {
    module.exports.httpStatuses.push(sc);
    module.exports.httpStatusesRandom.push(sc);
}

module.exports.getRandomHttpStatusCode = function(){
    var idx = module.exports.getRandomArbitrary(0,module.exports.httpStatusesRandom.length);
    return module.exports.httpStatusesRandom[idx];
};

module.exports.getHttpStatusMessage = function(code){
    return code in module.exports.httpStatusCodes ? module.exports.httpStatusCodes[code] : 'UNKNOWN';
};
