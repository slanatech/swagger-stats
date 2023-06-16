'use strict';

const http = require('http');
const Hapi = require('@hapi/hapi');
const swStats = require('../../lib');    // require('swagger-stats');


const swaggerSpec = require('../spectest/petstore3.json');

let server = null;

function waitfor(t, v) {
    return new Promise(function(resolve) {
        setTimeout(resolve.bind(null, v), t)
    });
}

const init = async () => {

    server = Hapi.server({
        port: 3040,
        host: 'localhost'
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return 'Hello World!';
        }
    });

    server.route({
        method: 'GET',
        path: '/v2/paramstest/{code}/and/{value}',
        handler: (request, h) => {
            return testerImpl(request,h);
        }
    });

    server.route({
        method: 'GET',
        path: '/stats',
        handler: (request, h) => {
            let stats = swStats.getCoreStats();
            return h.response(stats).code(200);
        }
    });

    server.route({
        method: 'GET',
        path: '/stop',
        handler: (request, h) => {
            stopApp();
            return 'STOP';
        }
    });

    server.route({
        method: 'GET',
        path: '/request',
        handler: (request, h) => {
            testEgressRequest();
            return 'OK';
        }
    });

    let swsOptions = {
        name: 'swagger-stats-hapitest',
        version: '0.99.7',
        hostname: "hostname",
        ip: "127.0.0.1",
        uriPath: '/swagger-stats',
        timelineBucketDuration: 1000,
        swaggerSpec:swaggerSpec,
        durationBuckets: [10,100,1000],
        metricsPrefix: 'hapitest_',
        elasticsearch: 'http://127.0.0.1:9200',
        elasticsearchIndexPrefix: 'swaggerstats-',
        authentication: true,
        sessionMaxAge: process.env.SWS_AUTHTEST_MAXAGE || 900,
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
    };

    // Enable Elasticsearch if specified
    if( process.env.SWS_ELASTIC ){
        swsOptions.elasticsearch = process.env.SWS_ELASTIC;
    }

    if( process.env.SWS_ELASTIC_INDEX_PREFIX ){
        swsOptions.elasticsearchIndexPrefix = process.env.SWS_ELASTIC_INDEX_PREFIX;
    }

    await server.register({
        plugin: swStats.getHapiPlugin,
        options: swsOptions
    });

    await server.ext('onRequest', async function (request, h) {
        // respond to any petstore api
        if(request.raw.req.url.startsWith('/pet') || request.raw.req.url.startsWith('/v2')) {
            return await mockApiImplementation(request,h);
        }else{
            return h.continue;
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

function stopApp() {
    console.log('stopping hapi server')
    server.stop({ timeout: 1000 }).then(function (err) {
        console.log('hapi server stopped');
        process.exit(0);
    })
}

// Mock implementation of any API request
// Supports the following parameters in x-sws-res header:
// x-sws-res={ code:<response code>,
//             message:<message to provide in response>,
//             delay:<delay to respond>,
//             payloadsize:<size of payload JSON to generate>
//           }
async function mockApiImplementation(request,h){

    let code = 500;
    let message = "MOCK API RESPONSE";
    let delay = 0;
    let payloadsize = 0;

    if(request.raw.req.url.startsWith('/v2/success')) {
        return h.response('OK').code(200).takeover();
    }
    if(request.raw.req.url.startsWith('/v2/redirect')) {
        return h.redirect('/v2/success').takeover();
    }
    if(request.raw.req.url.startsWith('/v2/client_error')) {
        return h.response('Not found').code(404).takeover();
    }
    if(request.raw.req.url.startsWith('/v2/server_error')) {
        return h.response('Server Error').code(500).takeover();
    }

    if(request.raw.req.url.startsWith('/v2/paramstest')) {
        return h.continue;
    }

    // get header
    let hdrSwsRes = request.headers['x-sws-res'];

    if(typeof hdrSwsRes !== 'undefined'){
        var swsRes = JSON.parse(hdrSwsRes);
        if( 'code' in swsRes ) code = parseInt(swsRes.code);
        if( 'message' in swsRes ) message = swsRes.message;
        if( 'delay' in swsRes ) delay = swsRes.delay;
        if( 'payloadsize' in swsRes ) payloadsize = swsRes.payloadsize;
    }

    if( delay > 0 ){
        await waitfor(delay);
    }

    return mockApiSendResponse(request,h,code,message,payloadsize);
}

function mockApiSendResponse(request,h,code,message,payloadsize){
    if(payloadsize<=0){
        return h.response(message)
            .code(code)
            .header('Content-Type', 'text/plain')
            .takeover();
    }else{
        // generate dummy payload of approximate size
        var dummyPayload = [];
        var adjSize = payloadsize-4;
        if(adjSize<=0) adjSize = 1;
        var str = '';
        for(var i=0;i<adjSize;i++) str += 'a';
        dummyPayload.push(str);
        return h.response(dummyPayload)
            .code(code)
            .takeover();
    }
}

async function testerImpl(request,h) {
    var code = 500;
    var message = "ERROR: Wrong parameters";
    if(('params' in request) && 'code' in request.params ){
        code = parseInt(request.params.code);
        message = "Request Method:" + request.method.toUpperCase() +', params.code: ' + request.params.code;
    }

    if(('query' in request) && ('delay' in request.query)){
        var delay = parseInt(request.query.delay);

        if( delay > 0 ){
            await waitfor(delay);
        }
    }

    return h.response({code: code, message: message}).code(code);
}

function testEgressRequest(){
    const options = {
        hostname: 'www.google.com',
        port: 80,
        path: '/',
        method: 'GET',
    };
    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            console.log('No more data in response.');
        });
    });
    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });
    req.end();
}

// TODO https://api.github.com/orgs/slanatech/repos



init();
