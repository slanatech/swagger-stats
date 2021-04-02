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

var debug = require('debug')('swstest:auth');

var swsTestFixture = require('./testfixture');
var swsTestUtils = require('./testutils');

var swaggerSpecUrl = './examples/authtest/petstore3.yaml';   // Default

var appAuthTest = null;
var apiAuthTest = null;


let initialStatRequests = 0;

function isNonEmptyString(str) {
    return typeof str == 'string' && !!str.trim();
}

function parseSetCookie(setCookieValue, options) {
    var parts = setCookieValue.split(';').filter(isNonEmptyString);
    var nameValue = parts.shift().split("=");
    var name = nameValue.shift();
    var value = nameValue.join("="); // everything after the first =, joined by a "=" if there was more than one part
    var cookie = {
        name: name, // grab everything before the first =
        value: value
    };

    parts.forEach(function (part) {
        var sides = part.split("=");
        var key = sides.shift().trimLeft().toLowerCase();
        var value = sides.join("=");
        if (key == "expires") {
            cookie.expires = new Date(value);
        } else if (key == 'max-age') {
            cookie.maxAge = parseInt(value, 10);
        } else if (key == 'secure') {
            cookie.secure = true;
        } else if (key == 'httponly') {
            cookie.httpOnly = true;
        } else {
            cookie[key] = value;
        }
    });

    return cookie;
}

setImmediate(function() {

    describe('Authentication test', function () {

        this.timeout(15000);

        var sessionIdCookie;

        describe('Initialize', function () {


            it('should initialize example app', function (done) {
                supertest(swsTestFixture.SWS_AUTHTEST_DEFAULT_URL).get(swsTestFixture.SWS_TEST_STATS_API)
                    .expect(403)
                    .end(function (err, res) {
                        if (err) {
                            process.env.SWS_AUTHTEST_MAXAGE = 2;
                            process.env.SWS_SPECTEST_URL = swaggerSpecUrl;
                            appAuthTest = require('../examples/authtest/authtest');
                            var dest = 'http://localhost:' + appAuthTest.app.get('port');
                            apiAuthTest = supertest(dest);
                            setTimeout(done, 1000);
                        } else {
                            apiAuthTest = supertest(swsTestFixture.SWS_AUTHTEST_DEFAULT_URL);
                            done();
                        }
                    });
            });

            it('should get 403 response for /stats', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);
                        done();
                    });
            });

            it('should get 403 response for /metrics', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_METRICS_API)
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);

                        done();
                    });
            });


            it('should not authenticate with wrong credentials', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .auth('wrong', 'wrong')
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);
                        done();
                    });
            });

            it('should authenticate with correct credentials', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .auth('swagger-stats', 'swagger-stats')
                    .expect(200)
                    .expect('set-cookie', /sws-session-id/)
                    .end(function (err, res) {
                        if (err) return done(err);

                        var setCookie = res.headers['set-cookie'][0]; //Setting the cookie
                        var parsed = parseSetCookie(setCookie);
                        sessionIdCookie = parsed.value;

                        done();
                    });
            });

            it('should get statistics values', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .set('Cookie', ['sws-session-id='+sessionIdCookie])
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        initialStatRequests = res.body.all.requests;
                        done();
                    });
            });

            it('should send test request from swagger spec', function (done) {
                apiAuthTest.get('/v2/pet/findByTags')
                    .set('x-sws-res','{"code":"200","message":"TEST","delay":"50","payloadsize":"5"}')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        done();
                    });
            });

            it('should logout', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_LOGOUT_API)
                    .set('Cookie', ['sws-session-id='+sessionIdCookie])
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        done();
                    });
            });

            it('should not get statistics after logout', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .set('Cookie', ['sws-session-id='+sessionIdCookie])
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);

                        done();
                    });
            });

            it('should not login with wrong credentials using promise based auth method', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .auth('swagger-promise', 'wrong')
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);
                        done();
                    });
            });

            it('should login again using promise based auth method', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .auth('swagger-promise', 'swagger-promise')
                    .expect(200)
                    .expect('set-cookie', /sws-session-id/)
                    .expect('x-sws-authenticated', /true/)
                    .end(function (err, res) {
                        if (err) return done(err);

                        var setCookie = res.headers['set-cookie'][0]; //Setting the cookie
                        var parsed = parseSetCookie(setCookie);
                        sessionIdCookie = parsed.value;

                        done();
                    });
            });

            it('should get statistics after second login', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .set('Cookie', ['sws-session-id='+sessionIdCookie])
                    .expect(200)
                    .expect('x-sws-authenticated', /true/)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        // Should see exactly one request: non-swagger requests monitoring is disabled in this test
                        (res.body.all.requests).should.be.equal(initialStatRequests + 1);
                        done();
                    });
            });

            it('should wait for session to expire', function (done) {
                setTimeout(function(){done()},2000);
            });

            it('should not get statistics after session expired', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .set('Cookie', ['sws-session-id='+sessionIdCookie])
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);

                        done();
                    });
            });

            it('should not authenticate /metrics with wrong credentials', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_METRICS_API)
                    .auth('wrong', 'wrong')
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);

                        done();
                    });
            });

            it('should authenticate and return /metrics with right credentials', function (done) {
                apiAuthTest.get(swsTestFixture.SWS_TEST_METRICS_API)
                    .auth('swagger-stats', 'swagger-stats')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        done();
                    });
            });

        });

/*
        // Get API Stats, and check that number of requests / responses is correctly calculated
        describe('Check Statistics', function () {

            it('should return collected statistics', function (done) {
                apiTimelineTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'timeline'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        res.body.should.have.property('timeline');
                        res.body.timeline.should.have.property('data');
                        //timelineStatsCurrent = res.body.timeline.data;
                        done();
                    });
            });

            it('should have correct values of timeline statistics', function (done) {


                for( var tid in expected_timeline_values) {
                    debug('Comparing[%s]: Expected %s Actual:%s', tid, JSON.stringify(expected_timeline_values[tid]),JSON.stringify(timelineStatsCurrent[tid]) );
                    timelineStatsCurrent.should.have.property(tid);
                    timelineStatsCurrent[tid].should.have.property('stats');
                    (expected_timeline_values[tid].requests).should.be.equal(timelineStatsCurrent[tid].stats.requests);
                    (expected_timeline_values[tid].errors).should.be.equal(timelineStatsCurrent[tid].stats.errors);
                    (expected_timeline_values[tid].success).should.be.equal(timelineStatsCurrent[tid].stats.success);
                    (expected_timeline_values[tid].redirect).should.be.equal(timelineStatsCurrent[tid].stats.redirect);
                    (expected_timeline_values[tid].client_error).should.be.equal(timelineStatsCurrent[tid].stats.client_error);
                    (expected_timeline_values[tid].server_error).should.be.equal(timelineStatsCurrent[tid].stats.server_error);
                    (expected_timeline_values[tid].total_req_clength).should.be.equal(timelineStatsCurrent[tid].stats.total_req_clength);
                    (expected_timeline_values[tid].total_res_clength).should.be.equal(timelineStatsCurrent[tid].stats.total_res_clength);
                    (expected_timeline_values[tid].avg_req_clength).should.be.equal(timelineStatsCurrent[tid].stats.avg_req_clength);
                    (expected_timeline_values[tid].avg_res_clength).should.be.equal(timelineStatsCurrent[tid].stats.avg_res_clength);
                    (expected_timeline_values[tid].req_rate).should.be.equal(timelineStatsCurrent[tid].stats.req_rate);
                    (expected_timeline_values[tid].err_rate).should.be.equal(timelineStatsCurrent[tid].stats.err_rate);
                }

                done();
            });

        });
*/

    });

    run();

});

