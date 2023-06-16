'use strict';

var http = require('http');
var path = require('path');
var debug = require('debug')('sws:spectest');

//http.globalAgent.keepAlive = true;

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

var swaggerParser = require('swagger-parser');

var swStats = require('../../lib');    // require('swagger-stats');

var app = module.exports = express();
app.use(expressBodyParser.json());
app.use(expressBodyParser.urlencoded({ extended: true }));

// JSON formatting
app.set('json spaces', 2);
app.set('json replacer', null);

// all environments
app.set('port', process.env.PORT || 3040);

// Suppress cache on the GET API responses
app.disable('etag');

app.get('/', function(req,res) {
    res.redirect('/swagger-stats/');
});

// Return Prometheus metrics from prom-client
app.get('/metrics', function(req,res) {
    res.status(200).set('Content-Type', 'text/plain');
    Promise.resolve(promClient.register.metrics()).then( (x) => {
        res.end(x);
    });
});


// Testing validation of 3rd-party API spec
var swaggerSpec = null;
var parser = new swaggerParser();

//var specLocation = 'petstore3.yaml';
var specLocation = 'petstore.yaml';

if( process.env.SWS_SPECTEST_URL ){
    specLocation = process.env.SWS_SPECTEST_URL;
}

var tlBucket = 60000;
if( process.env.SWS_SPECTEST_TIMEBUCKET ){
    tlBucket = parseInt(process.env.SWS_SPECTEST_TIMEBUCKET);
}

debug('Loading Swagger Spec from ' + specLocation );

parser.validate(specLocation,function(err, api) {
    if (!err) {

        debug('Success validating swagger file!');
        swaggerSpec = api;

        var swsOptions = {
            name: 'swagger-stats-spectest',
            version: '0.99.7',
            hostname: "hostname",
            ip: "127.0.0.1",
            timelineBucketDuration: tlBucket,
            swaggerSpec:swaggerSpec,
            //basePath: '/api',
            uriPath: '/swagger-stats',
            durationBuckets: [10, 25, 50, 100, 200],
            requestSizeBuckets: [10, 25, 50, 100, 200],
            responseSizeBuckets: [10, 25, 50, 100, 200],
            apdexThreshold: 25,
            onResponseFinish: function(req,res,rrr){

                // You can remove non-needed or private attributes from Request Response Record
                delete rrr.http.request.headers['user-agent'];

                // You can also extend Request Response Record with custom attributes

                // All custom properties under attrs will be casted to string and indexed in ElasticSearch as keyword
                rrr.attrs = {
                    test1: "test1",
                    test2: "test2",
                    test3: 10,
                    test4: true,
                    test5: {prop:"value"}
                };

                // All custom properties under attrsint will be casted to numeric and indexed in ElasticSearch as long
                rrr.attrsint = {
                    numvalue1: 100,
                    numvalue2: "100",
                    numvalue3: false,
                    numvalue4: "",
                    numvalue5: {prop:"value"}
                };

                debug('onResponseFinish: %s', JSON.stringify(rrr));
            }

        };

        // Enable Elasticsearch if specified
        if( process.env.SWS_ELASTIC ){
            swsOptions.elasticsearch = process.env.SWS_ELASTIC;
        }

        if( process.env.SWS_ELASTIC_INDEX_PREFIX ){
            swsOptions.elasticsearchIndexPrefix = process.env.SWS_ELASTIC_INDEX_PREFIX;
        }


        // Enable swagger-stats middleware with options
        app.use(swStats.getMiddleware(swsOptions));

        // Implement mock API
        app.use(mockApiImplementation);

        // Setup server
        server = http.createServer(app);
        server.listen(app.get('port'));
        server.keepAliveTimeout = 61 * 1000;
        server.headersTimeout = 65 * 1000;
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

module.exports.app = app;
