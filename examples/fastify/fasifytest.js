'use strict';

const http = require('http');
// Require the framework and instantiate it
const fastify = require('fastify')({
    logger: true
});
const swStats = require('../../lib');    // require('swagger-stats');

const swaggerSpec = require('./petstore.json');

let server = null;

// Declare a route
fastify.get('/', function (request, reply) {
    reply.send({ hello: 'world' })
});

fastify.get('/v2/paramstest/:code/and/:value', function (request, reply) {
    testerImpl(request,reply);
});

fastify.route({
    method: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT','OPTIONS'],
    url: '/v2/*',
    handler: async function(request, reply){
        await mockApiImplementation(request, reply);
    }
});

let swsOptions = {
    name: 'swagger-stats-fastify',
    version: '0.95.10',
    timelineBucketDuration: 1000,
    swaggerSpec:swaggerSpec,
    elasticsearch: 'http://127.0.0.1:9200',
    elasticsearchIndexPrefix: 'swaggerstats-'
};

fastify.use(swStats.getMiddleware(swsOptions));

// Mock API
/*
fastify.use(function(req,res,next){
    if(req.url.startsWith('/v2/paramstest')) {
        next();
    } else if(req.url.startsWith('/v2')){
        mockApiImplementation(req,res,next);
    }else{
        next();
    }
});
*/

// Run the server!
fastify.listen(3040, function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    fastify.log.info(`server listening on ${address}`)
});

function waitfor(t, v) {
    return new Promise(function(resolve) {
        setTimeout(resolve.bind(null, v), t)
    });
}

/*
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
        version: '0.95.10',
        hostname: "hostname",
        ip: "127.0.0.1",
        uriPath: '/swagger-stats',
        timelineBucketDuration: 1000,
        swaggerSpec:swaggerSpec,
        durationBuckets: [10,100,1000],
        metricsPrefix: 'hapitest_',
        elasticsearch: 'http://127.0.0.1:9200',
        elasticsearchIndexPrefix: 'swaggerstats-'
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
        if(request.raw.req.url.startsWith('/v2')) {
            return await mockApiImplementation(request,h);
        }else{
            return h.continue;
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};
*/


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

/*
function mockApiImplementation(req,res,next){

    var code = 500;
    var message = "MOCK API RESPONSE";
    var delay = 0;
    var payloadsize = 0;

    // get header
    var hdrSwsRes = req.headers['x-sws-res'];

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
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(message));
        res.writeHead(code);
        res.end(message);
        //res.status(code).send(message);
    }else{
        // generate dummy payload of approximate size
        var dummyPayload = [];
        var adjSize = payloadsize-4;
        if(adjSize<=0) adjSize = 1;
        var str = '';
        for(var i=0;i<adjSize;i++) str += 'a';
        dummyPayload.push(str);
        //res.status(code).json(dummyPayload);
        let body = JSON.stringify(dummyPayload);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Length', Buffer.byteLength(body));
        res.writeHead(code);
        res.end(body);
    }
}
*/

async function mockApiImplementation(request,reply){

    let code = 500;
    let message = "MOCK API RESPONSE";
    let delay = 0;
    let payloadsize = 0;

    if(request.raw.url.startsWith('/v2/success')) {
        reply.code(200).send('OK');
    }
    if(request.raw.url.startsWith('/v2/redirect')) {
        reply.redirect('/v2/success');
    }
    if(request.raw.url.startsWith('/v2/client_error')) {
        reply.code(404).send('Not found');
    }
    if(request.raw.url.startsWith('/v2/server_error')) {
        reply.code(500).send('Server Error');
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

    return mockApiSendResponse(request,reply,code,message,payloadsize);
}

function mockApiSendResponse(request,reply,code,message,payloadsize){
    if(payloadsize<=0){
        reply.code(code).send(message);
    }else{
        // generate dummy payload of approximate size
        var dummyPayload = [];
        var adjSize = payloadsize-4;
        if(adjSize<=0) adjSize = 1;
        var str = '';
        for(var i=0;i<adjSize;i++) str += 'a';
        dummyPayload.push(str);
        reply.code(code).send(dummyPayload);
    }
}


async function testerImpl(request, reply) {
    var code = 500;
    var message = "ERROR: Wrong parameters";
    if(('params' in request) && 'code' in request.params ){
        code = parseInt(request.params.code);
        message = "Request Method:" + request.raw.method.toUpperCase() +', params.code: ' + request.params.code;
    }

    if(('query' in request) && ('delay' in request.query)){
        var delay = parseInt(request.query.delay);

        if( delay > 0 ){
            await waitfor(delay);
        }
    }

    reply.code(code).send({code: code, message: message});
    //return h.response({code: code, message: message}).code(code);
}




