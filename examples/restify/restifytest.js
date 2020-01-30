const path = require('path');
const restify = require('restify');
const debug = require('debug')('sws:restify');

const swStats = require('../../lib');    // require('swagger-stats');

const specLocation = path.join(__dirname, '..', 'spectest','petstore3.json');
debug('Loading Swagger Spec from ' + specLocation );
const swaggerSpec = require( specLocation );

const server = restify.createServer();

// Use swagger-stats middleware
server.pre(swStats.getMiddleware({
    name: 'restifytest',
    version: '0.95.15',
    hostname: "hostname",
    ip: "127.0.0.1",
    timelineBucketDuration:1000,
    swaggerSpec:swaggerSpec,
    swaggerOnly: false,
    uriPath: '/swagger-stats',
    durationBuckets: [10, 25, 50, 100, 200],
    requestSizeBuckets: [10, 25, 50, 100, 200],
    responseSizeBuckets: [10, 25, 50, 100, 200],
    apdexThreshold: 100,
    elasticsearch: 'http://127.0.0.1:9200',
    elasticsearchIndexPrefix: 'swaggerstats-',
    onResponseFinish: function(req,res,rrr){
        debug('onResponseFinish: %s', JSON.stringify(rrr));
    }
}));

// Mock API
server.pre(mockApiImplementation);

server.listen(3040, function() {
    console.log('%s listening at %s', server.name, server.url);
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
            next();
        },delay);
    }else{
        mockApiSendResponse(res,code,message,payloadsize);
        next();
    }
}

function mockApiSendResponse(res,code,message,payloadsize){
    if(payloadsize<=0){
        res.status(parseInt(code));
        res.send(message);
    }else{
        // generate dummy payload of approximate size
        var dummyPayload = [];
        var adjSize = payloadsize-4;
        if(adjSize<=0) adjSize = 1;
        var str = '';
        for(var i=0;i<adjSize;i++) str += 'a';
        dummyPayload.push(str);
        res.contentType = 'json';
        res.status(parseInt(code));
        res.send(dummyPayload);
    }
}
