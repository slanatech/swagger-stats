'use strict';

const http = require('http');
// Require the framework and instantiate it
const fastify = require('fastify')({
    logger: false
});
const swStats = require('../../lib');    // require('swagger-stats');

const swaggerSpec = require('../spectest/petstore3.json');

let server = null;

fastify.get('/', function (request, reply) {
    //reply.send({ hello: 'world' })
    reply.redirect('/swagger-stats/');
});

fastify.get('/v2/paramstest/:code/and/:value', function (request, reply) {
    testerImpl(request,reply);
});

fastify.get('/stats', function (request, reply) {
    reply.send(swStats.getCoreStats());
});

fastify.get('/stop', function (request, reply) {
    process.exit(0);
});


fastify.route({
    method: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT','OPTIONS'],
    url: '/v2/*',
    handler: async function(request, reply){
        await mockApiImplementation(request, reply);
    }
});

fastify.route({
    method: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT','OPTIONS'],
    url: '/pet*',
    handler: async function(request, reply){
        await mockApiImplementation(request, reply);
    }
});

let swsOptions = {
    name: 'swagger-stats-fastify',
    version: '0.99.7',
    timelineBucketDuration: 1000,
    swaggerSpec:swaggerSpec,
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
    //elasticsearch: 'http://127.0.0.1:9200',
    //elasticsearchIndexPrefix: 'swaggerstats-'
};

// Enable swagger-stats
fastify.register(require('fastify-express')).then(()=>{
    fastify.register(swStats.getFastifyPlugin, swsOptions);
});


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

async function mockApiImplementation(request,reply){

    let code = 500;
    let message = "MOCK API RESPONSE";
    let delay = 0;
    let payloadsize = 0;

    if(request.raw.url.startsWith('/v2/success')) {
        return reply.code(200).send('OK');
    }
    if(request.raw.url.startsWith('/v2/redirect')) {
        return reply.redirect('/v2/success');
    }
    if(request.raw.url.startsWith('/v2/client_error')) {
        return reply.code(404).send('Not found');
    }
    if(request.raw.url.startsWith('/v2/server_error')) {
        return reply.code(500).send('Server Error');
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




