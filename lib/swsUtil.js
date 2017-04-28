/*
 * Created by sv2 on 3/15/17.
 * swagger-stats utilities
 */

'use strict';


// swagger-stats supported options
module.exports.supportedOptions = {
    name        : "name",           // Name of service this component provides
    version     : "version",        // Version of this component
    nodehostname: "nodehostname",   // Hostname of this node. Will attempt to detect if not provided
    nodename    : "nodename",       // Name of this node: there could be multiple nodes in this service. Will set to nodehostname if not provided
    nodeaddress : "nodeaddress",    // Address of this node: there could be multiple nodes in this service. Will attempt to detect if not provided
    swaggerSpec : "swaggerSpec"     // Swagger specification JSON document. Should be pre-validated and with resolved references
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
    all         : parseInt('1111111', 2),
    "*"         : parseInt('1111111', 2)
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

