'use strict';

const Hapi = require('@hapi/hapi');
const swStats = require('../../lib');    // require('swagger-stats');
const Inert = require('@hapi/inert');

const init = async () => {

    const server = Hapi.server({
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

    await server.register(Inert);

    await server.register({
        plugin: swStats.getHapiPlugin,
        options: {}
    });

    await server.ext('onRequest', function (request, h) {
        // respond to any petstore api
        if(request.raw.req.url.startsWith('/v2')) {
            return mockApiImplementation(request,h);
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

// Mock implementation of any API request
// Supports the following parameters in x-sws-res header:
// x-sws-res={ code:<response code>,
//             message:<message to provide in response>,
//             delay:<delay to respond>,
//             payloadsize:<size of payload JSON to generate>
//           }
function mockApiImplementation(request,h){

    var code = 500;
    var message = "MOCK API RESPONSE";
    var delay = 0;
    var payloadsize = 0;


    // get header
    var hdrSwsRes = request.header('x-sws-res');

    if(typeof hdrSwsRes !== 'undefined'){
        var swsRes = JSON.parse(hdrSwsRes);
        if( 'code' in swsRes ) code = swsRes.code;
        if( 'message' in swsRes ) message = swsRes.message;
        if( 'delay' in swsRes ) delay = swsRes.delay;
        if( 'payloadsize' in swsRes ) payloadsize = swsRes.payloadsize;
    }

    /* TODO Delay
    if( delay > 0 ){
        setTimeout(function(){
            mockApiSendResponse(request,h,code,message,payloadsize);
        },delay);
    }else{
    }
    */

    mockApiSendResponse(request,h,code,message,payloadsize);
}

function mockApiSendResponse(request,h,code,message,payloadsize){
    if(payloadsize<=0){
        return h.response(message)
            .code(200)
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
            .code(200)
            .takeover();
    }
}


init();
