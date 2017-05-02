'use strict';

var http = require('http');
var path = require('path');
var debug = require('debug')('sws:spectest');

// Server
var server = null;

// Express and middlewares
var express = require('express');
var expressBodyParser = require('body-parser');
var expressFavicon = require('serve-favicon');
var expressStatic = require('serve-static');

var swaggerParser = require('swagger-parser');

var swStats = require('../../lib');    // require('swagger-stats');

var app = module.exports = express();
app.use(expressFavicon(path.join(__dirname, '../../ui/favicon.png')));
app.use('/ui',expressStatic(path.join(__dirname, '../../ui')));
app.use('/node_modules',expressStatic(path.join(__dirname, '../../node_modules')));
app.use(expressBodyParser.json());
app.use(expressBodyParser.urlencoded({ extended: true }));

// all environments
app.set('port', process.env.PORT || 3030);

// Suppress cache on the GET API responses
app.disable('etag');

app.get('/', function(req,res) {
    // TODO - remove, use bundled UI
    res.redirect('/ui');
});

app.get('/apidoc.json', function(req,res){
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});


// Testing validation of 3rd-party API spec
var swaggerSpec = null;
var parser = new swaggerParser();

if(!process.env.SWS_SPECTEST_URL){
    debug('ERROR: Swagger spec URL is not specified - set environment variable SWS_SPECTEST_URL');
    return;
}

var specLocation = process.env.SWS_SPECTEST_URL;
debug('Loading Swagger Spec from ' + specLocation );

parser.validate(specLocation,function(err, api) {
    if (err) {
        debug('Error validating swagger file: ' + err);
        return;
    }else {
        debug('Success validating swagger file!');
        swaggerSpec = api;

        // Track statistics on API request / responses
        app.use(swStats.getMiddleware({swaggerSpec:swaggerSpec}));

        // Implement mock API
        app.use(mockApiImplementation);

        // Setup server
        server = http.createServer(app);
        server.listen(app.get('port'));
        debug('Server started on port ' + app.get('port') + ' http://localhost:'+app.get('port'));
    }
});

// Mock implementation of any API request
// Supports the following parameters in x-sws-res header:
// x-sws-res={ code:<response code>,
//             message:<message to provide in response>,
//             delay:<delay to respond>,
//             payloadsize:<size of payload JSON to generate>
//           }
function mockApiImplementation(req,res,next){

    var code = 500;
    var message = "MOCK API RESPONSE";
    var delay = 0;
    var payloadsize = 0;

    // get header
    var hdrSwsRes = req.header('x-sws-res');

    if(typeof hdrSwsRes !== 'undefined'){
        var swsRes = JSON.parse(hdrSwsRes);
        if( 'code' in swsRes ) code = swsRes.code;
        if( 'message' in swsRes ) message = swsRes.message;
        if( 'delay' in swsRes ) delay = swsRes.delay;
        if( 'payloadsize' in swsRes ) payloadsize = swsRes.payloadsize;
    }

    if( delay > 0 ){
        setTimeout(function(){
            mockApiSendResponse(res,code,message,payloadsize);
        },delay);
    }else{
        mockApiSendResponse(res,code,message,payloadsize);
    }
}

function mockApiSendResponse(res,code,message,payloadsize){
    if(payloadsize<=0){
        res.status(code).send(message);
    }else{
        // generate dummy payload of approximate size
        var dummyPayload = [];
        var adjSize = payloadsize-4;
        if(adjSize<=0) adjSize = 1;
        var str = '';
        for(var i=0;i<adjSize;i++) str += 'a';
        dummyPayload.push(str);
        res.status(code).json(dummyPayload);
    }
}


process.on('SIGTERM', function(){
    debug('Service shutting down gracefully');
    process.exit();
});

if (process.platform === 'win32') {
    require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    }).on('SIGINT', function () {
        process.emit('SIGINT');
    });
}

process.on('SIGINT', function () {
    process.exit();
});

module.exports.app = app;
module.exports.teardown = function(callback){
  server.close(callback);
};
