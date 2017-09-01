'use strict';
var chai = require('chai');
chai.should();
var expect = chai.expect;

var Q = require('q');
var http = require('http');
var fs = require('fs');
var cuid = require('cuid');
var path = require('path');
var supertest = require('supertest');
var cp = require('child_process');
var swaggerParser = require('swagger-parser');

var swsTestFixture = require('../testfixture');
var swsTestUtils = require('../testutils');

var appRandomTest = null;
var apiRandomTest = null;

var debug = require('debug')('swstest:randomtest');

var swaggerSpecUrl = './examples/spectest/petstore.yaml';   // Default
if( process.env.SWS_SPECTEST_URL ){
    swaggerSpecUrl = process.env.SWS_SPECTEST_URL;
}
debug('Using Swagger Specification: %s', swaggerSpecUrl);


var swaggerSpec = null;
var parser = new swaggerParser();

var apiOperationsList = [];


// implementation of sending random requests in a loop with varying frequency

function sendRandomRequestsOnce(iteration, deferred){

    if(iteration<=0){
        deferred.resolve();
        return;
    }


    // Generate one requests for each API operation
    var reqcntr = 0;
    apiOperationsList.forEach(function(apiop) {
        var yesno = swsTestUtils.getRandomArbitrary(0,100);
        if(yesno>=50) {
            reqcntr++;
            var randomcode = swsTestUtils.getRandomHttpStatusCode();
            var hdr = {
                code: randomcode,
                message: swsTestUtils.getHttpStatusMessage(randomcode),
                delay: swsTestUtils.getRandomArbitrary(0, 100),
                payloadsize: swsTestUtils.getRandomArbitrary(0, 200)
            };
            var opCallDef = apiop.opCallDef;
            var xswsResHdr = JSON.stringify(hdr);

            debug('>>>>> %s %s query:%s x-sws-res:%s', opCallDef.method, opCallDef.uri, JSON.stringify(opCallDef.query), xswsResHdr);

            // Use raw node http to send test request, so we can send correctly requests to uri like /#Create ...
            const options = {
                hostname: swsTestFixture.SWS_TEST_DEFAULT_HOST, //'localhost'
                port: swsTestFixture.SWS_TEST_SPECTEST_PORT, //3040,
                path: opCallDef.uri,
                method: opCallDef.method,
                headers: {
                    'x-sws-res': xswsResHdr
                }
            };
            var body = null;
            if ((opCallDef.method === 'post') || (opCallDef.method === 'put')) {
                var reqPayloadSize = swsTestUtils.getRandomArbitrary(0, 200);
                var str = '';
                for (var i = 0; i < reqPayloadSize; i++) str += 'r';
                body = JSON.stringify({data: str});
                options.headers["Content-Type"] = "application/json";
                options.headers["Content-Length"] = Buffer.byteLength(body);
            }
            const req = http.request(options, function (res) {
                // TODO Check status code validness ????
                //res.should.have.property('statusCode');
                //res.statusCode.should.be.equal(parseInt(randomcode));
                reqcntr--;
                if (reqcntr <= 0) {
                    // got all responses for requests sent in this iteration
                    var delay = swsTestUtils.getRandomArbitrary(100, 500);
                    // repeat after varying delay
                    setTimeout(sendRandomRequestsOnce, delay, iteration - 1, deferred);
                }
            });
            body !== null ? req.end(body) : req.end();
        }
    });

}

function generateRandomRequests(){
    var deferred = Q.defer();
    sendRandomRequestsOnce(10000,deferred);
    return deferred.promise;
}


// First we need to load and validate swagger spec
// Use --delay mocha flag

parser.validate(swaggerSpecUrl, function (err, api) {

    if (err) {
        debug('Error validating swagger spec: ' + err);
        return;
    }

    swaggerSpec = api;
    apiOperationsList = swsTestUtils.generateApiOpList(swaggerSpec);

    describe('Swagger API Random Test', function () {
        this.timeout(6000000);

        it('should initialize spectest app', function (done) {
            supertest(swsTestFixture.SWS_SPECTEST_DEFAULT_URL).get(swsTestFixture.SWS_TEST_STATS_API)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        process.env.SWS_SPECTEST_URL = swaggerSpecUrl;
                        appRandomTest = require('../../examples/spectest/spectest');
                        apiRandomTest = supertest('http://localhost:' + appRandomTest.app.get("port"));
                        setTimeout(done, 500);
                    } else {
                        apiRandomTest = supertest(swsTestFixture.SWS_SPECTEST_DEFAULT_URL);
                        done();
                    }
                });
        });

        it('should send random API requests', function (done) {
            generateRandomRequests()
                .then(function(){
                    debug('generateRandomRequests - finished!');
                    done();
                })
        });

    });

    run();
});



