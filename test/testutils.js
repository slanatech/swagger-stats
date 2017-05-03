/*
 * Created by sv2 on 3/9/17.
 *
 * SWS Test utilities
 */

'use strict';
var swsUtil = require('../lib/swsUtil');

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
