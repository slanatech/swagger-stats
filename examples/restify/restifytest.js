const path = require('path');
const restify = require('restify');
const debug = require('debug')('sws:restify');

const swStats = require('../../lib');    // require('swagger-stats');

const specLocation = path.join(__dirname, '..', 'spectest','petstore3.json');
debug('Loading Swagger Spec from ' + specLocation );
const swaggerSpec = require( specLocation );

const server = restify.createServer();

server.use(restify.plugins.queryParser());

// Use swagger-stats middleware
server.pre(swStats.getMiddleware({
    name: 'restifytest',
    version: '0.99.7',
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
    },
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
}));

// Mock API
server.pre(mockApiImplementation);

// Tester API
server.get('/v2/paramstest/:code/and/:value', testerImpl);

// Stats
server.get('/stats', function(req,res,next){
    res.status(200);
    res.send(swStats.getCoreStats());
    next();
});



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

    if(req.url.startsWith('/v2/paramstest') || req.url.startsWith('/stats')) {
        next();
        return;
    }

    if(req.url.startsWith('/v2/success')) {
        res.sendRaw(200, 'OK');
        next();
        return;
    }
    if(req.url.startsWith('/v2/redirect')) {
        res.redirect('/v2/success',next);
        return;
    }
    if(req.url.startsWith('/v2/client_error')) {
        res.sendRaw(404, 'Not found');
        next();
        return;
    }
    if(req.url.startsWith('/v2/server_error')) {
        res.sendRaw(500, 'Server Error');
        next();
        return;
    }

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


function testerImpl(req, res, next) {
    var code = 500;
    var message = "ERROR: Wrong parameters";
    if(('params' in req) && 'code' in req.params ){
        code = parseInt(req.params.code);
        message = "Request Method:" + req.method.toUpperCase() +', params.code: ' + req.params.code;
    }

    let delay = 0;
    if(('query' in req) && ('delay' in req.query)){
        delay = parseInt(req.query.delay);
    }

    if( delay > 0 ){
        setTimeout(function(){
            res.status(code);
            res.send({code: code, message: message});
            next();
        },delay);
    }else{
        res.status(code);
        res.send({code: code, message: message});
        next();
    }
}
