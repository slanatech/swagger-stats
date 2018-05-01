'use strict';

var http = require('http');
var path = require('path');
var debug = require('debug')('sws:authtest');

// Prometheus Client
const promClient = require('prom-client');
const collectDefaultMetrics = promClient.collectDefaultMetrics;
// Probe every 1 second
collectDefaultMetrics({ timeout: 1000 });

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

// JSON formatting
app.set('json spaces', 2);
app.set('json replacer', null);

// all environments
app.set('port', process.env.PORT || 3050);

// Suppress cache on the GET API responses
app.disable('etag');

app.get('/', function(req,res) {
    res.redirect('/swagger-stats/ui');
});

// Return Prometheus metrics from prom-client
app.get('/metrics', function(req,res) {
    res.status(200).set('Content-Type', 'text/plain');
    res.end(promClient.register.metrics());
});

var specLocation = path.join(__dirname, 'petstore.json');

var maxAge = 900;
if( process.env.SWS_AUTHTEST_MAXAGE ){
    maxAge = parseInt(process.env.SWS_AUTHTEST_MAXAGE);
}

debug('Loading Swagger Spec from ' + specLocation );

var swaggerSpec = require( specLocation );

// Use swagger-stats middleware with authentication enabled
app.use(swStats.getMiddleware({
    name: 'swagger-stats-authtest',
    version: '0.95.5',
    hostname: "hostname",
    ip: "127.0.0.1",
    swaggerSpec:swaggerSpec,
    swaggerOnly: true,
    uriPath: '/swagger-stats',
    durationBuckets: [10, 25, 50, 100, 200],
    requestSizeBuckets: [10, 25, 50, 100, 200],
    responseSizeBuckets: [10, 25, 50, 100, 200],
    apdexThreshold: 100,
    onResponseFinish: function(req,res,rrr){
        debug('onResponseFinish: %s', JSON.stringify(rrr));
    },
    authentication: true,
    sessionMaxAge: maxAge,
    onAuthenticate: function(req,username,password){
        // simple check for username and password
        if(username==='swagger-stats') {
            return ((username === 'swagger-stats') && (password === 'swagger-stats'));
        } else if(username==='swagger-promise'){
            return new Promise(function(resolve) {
                setTimeout(function(){
                    resolve((username === 'swagger-promise') && (password === 'swagger-promise'));
                }, 1000);
            });
        }
        return false;
    }
}));


// Implement mock API
app.use(mockApiImplementation);

// Setup server
server = http.createServer(app);
server.listen(app.get('port'));
debug('Server started on port ' + app.get('port') + ' http://localhost:'+app.get('port'));


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

process.on('unhandledRejection', function(error) {
    debug('unhandledRejection', error.message, error.stack);
});


module.exports.app = app;
