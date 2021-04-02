'use strict';
var util = require('util');
var chai = require('chai');
chai.should();
var expect = chai.expect;
var supertest = require('supertest');
var cuid = require('cuid');

var Q = require('q');
var http = require('http');

// We will use it to store expected values
var swsReqResStats = require('../lib/swsReqResStats');
var swsUtil = require('../lib/swsUtil');

var debug = require('debug')('swstest:baseline');

var swsTestFixture = require('./testfixture');
var swsTestUtils = require('./testutils');


// duration of method test - number of requests
var method_test_duration = 50;
if( process.env.SWS_METHOD_TEST_DURATION){
    method_test_duration = parseInt(process.env.SWS_METHOD_TEST_DURATION);
}

var expected_method_values = {};


function sendTestRequestsOnce(iteration, deferred){

    if(iteration<=0){
        deferred.resolve();
        return;
    }

    //var methods = ['get','post','put','delete','head','options'];
    var methods = ['GET','POST','PUT','DELETE','OPTIONS'];

    // Generate random number of requests each iteration
    var reqcntr = 0;

    methods.forEach(function(method) {

        if(!(method in expected_method_values) ) {
            expected_method_values[method] = new swsReqResStats();
        }
        var methodCurrent = expected_method_values[method];

        var numReq = swsTestUtils.getRandomArbitrary(0,5);
        for(var i=0;i<numReq;i++) {

            reqcntr++;

            var randomcode = swsTestUtils.getRandomHttpStatusCode();
            var hdr = {
                code: randomcode,
                message: swsTestUtils.getHttpStatusMessage(randomcode),
                delay: swsTestUtils.getRandomArbitrary(0, 100),
                payloadsize: swsTestUtils.getRandomArbitrary(10, 200)
            };
            var xswsResHdr = JSON.stringify(hdr);

            debug('>>>>> %s %s x-sws-res:%s', method, swsTestFixture.SWS_TEST_MOCK_API, xswsResHdr);

            const options = {
                hostname: swsTestFixture.SWS_TEST_DEFAULT_HOST, //'localhost'
                port: swsTestFixture.SWS_TEST_DEFAULT_PORT, //3030,
                path: swsTestFixture.SWS_TEST_MOCK_API,
                method: method,
                headers: {
                    'x-sws-res': xswsResHdr
                }
            };
            var body = null;
            if ((method === 'post') || (method === 'put')) {
                var reqPayloadSize = swsTestUtils.getRandomArbitrary(10, 200);
                var str = '';
                for (var i = 0; i < reqPayloadSize; i++) str += 'r';
                body = JSON.stringify([str]);
                options.headers["Content-Type"] = "application/json";
                options.headers["Content-Length"] = Buffer.byteLength(body);
            }

            // Store in expected values
            methodCurrent.requests++;
            methodCurrent[swsUtil.getStatusCodeClass(randomcode)]++;
            if(swsUtil.isError(randomcode)) methodCurrent.errors++;
            var req_clen = ( body!==null ? Buffer.byteLength(body) : 0 );
            methodCurrent.total_req_clength += req_clen;
            var res_clen = hdr.payloadsize;
            methodCurrent.total_res_clength += res_clen;
            if( req_clen > methodCurrent.max_req_clength ) methodCurrent.max_req_clength = req_clen;
            if( res_clen > methodCurrent.max_res_clength ) methodCurrent.max_res_clength = res_clen;
            methodCurrent.avg_req_clength = Math.floor(methodCurrent.total_req_clength / methodCurrent.requests);
            methodCurrent.avg_res_clength = Math.floor(methodCurrent.total_res_clength / methodCurrent.requests);

            const req = http.request(options, function (res) {
                reqcntr--;
                if (reqcntr <= 0) {
                    sendTestRequestsOnce(iteration - 1, deferred);
                }
            });
            body !== null ? req.end(body) : req.end();
        }
    });

}

function generateTestRequests(){
    var deferred = Q.defer();
    sendTestRequestsOnce( method_test_duration, deferred );
    return deferred.promise;
}


setImmediate(function() {

    describe('Method statistics test', function () {

        this.timeout(60000);

        var appTimelineTest = null;
        var apiTimelineTest = null;

        var timelineStatsInitial = null;
        var timelineStatsCurrent = null;

        var methodStatsInitial = null;
        var methodStatsCurrent = null;

        var client_error_id = cuid();
        var server_error_id = cuid();

        // 1 second
        var timeline_bucket_duration = 1000;


        describe('Initialize', function () {
            it('should initialize example app', function (done) {
                supertest(swsTestFixture.SWS_TEST_DEFAULT_URL).get(swsTestFixture.SWS_TEST_STATS_API)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            if( res && res.status === 403 ){
                                //let st = supertest(swsTestFixture.SWS_TEST_DEFAULT_URL)
                                apiTimelineTest = supertest.agent(swsTestFixture.SWS_TEST_DEFAULT_URL).auth('swagger-stats','swagger-stats');
                                done();
                            } else {
                                process.env.SWS_TEST_TIMEBUCKET = timeline_bucket_duration;
                                appTimelineTest = require('../examples/testapp/testapp');
                                apiTimelineTest = supertest('http://localhost:' + appTimelineTest.app.get('port'));
                                setTimeout(done, 500);
                            }
                        } else {
                            apiTimelineTest = supertest(swsTestFixture.SWS_TEST_DEFAULT_URL);
                            done();
                        }
                    });
            });
            it('should collect initial statistics values', function (done) {
                apiTimelineTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'method'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        res.body.should.have.property('method');
                        methodStatsInitial = res.body.method;
                        done();
                    });
            });
        });


        describe('Send Test Requests', function () {

            it('should send random number of test requests '+method_test_duration+' times', function (done) {
                generateTestRequests()
                    .then(function(){
                        debug('generateRandomRequests - finished!');
                        done();
                    })
            });

        });

        // Get API Stats, and check that number of requests / responses is correctly calculated
        describe('Check Statistics', function () {

            it('should return collected statistics', function (done) {
                apiTimelineTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'method'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        res.body.should.have.property('method');
                        methodStatsCurrent = res.body.method;
                        done();
                    });
            });

            it('should have correct values of method statistics', function (done) {


                for( var method in expected_method_values) {
                    //debug('Comparing[%s]: Expected %s Actual:%s', method, JSON.stringify(expected_method_values[method]),JSON.stringify(methodStatsCurrent[method]) );
                    console.log('Comparing[%s]: Expected %s Actual:%s', method, JSON.stringify(expected_method_values[method]),JSON.stringify(methodStatsCurrent[method]) );
                    methodStatsCurrent.should.have.property(method);
                    var adjustedStats = swsTestUtils.getRRStatsDiff(methodStatsInitial[method],methodStatsCurrent[method]);
                    console.log('Comparing[%s]: Expected %s Adjusted :%s', method, JSON.stringify(expected_method_values[method]),JSON.stringify(adjustedStats) );

                    (expected_method_values[method].requests).should.be.equal(adjustedStats.requests);
                    (expected_method_values[method].errors).should.be.equal(adjustedStats.errors);
                    (expected_method_values[method].success).should.be.equal(adjustedStats.success);
                    (expected_method_values[method].redirect).should.be.equal(adjustedStats.redirect);
                    (expected_method_values[method].client_error).should.be.equal(adjustedStats.client_error);
                    (expected_method_values[method].server_error).should.be.equal(adjustedStats.server_error);
                    (expected_method_values[method].total_req_clength).should.be.equal(adjustedStats.total_req_clength);
                    (expected_method_values[method].total_res_clength).should.be.equal(adjustedStats.total_res_clength);
                    (methodStatsCurrent[method].avg_req_clength).should.be.equal(Math.floor(methodStatsCurrent[method].total_req_clength/methodStatsCurrent[method].requests));
                    (methodStatsCurrent[method].avg_res_clength).should.be.equal(Math.floor(methodStatsCurrent[method].total_res_clength/methodStatsCurrent[method].responses));
                }

                done();
            });

        });


    });

    run();

});

