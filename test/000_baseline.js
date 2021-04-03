'use strict';
var fs = require('fs');
var path = require('path');

var util = require('util');
var chai = require('chai');
chai.should();
var expect = chai.expect;
var supertest = require('supertest');
var cuid = require('cuid');

var debug = require('debug')('swstest:baseline');

// SWS test fixture
var swsTestFixture = require('./testfixture');

// SWS Utils
var swsUtil = require('../lib/swsUtil');

// SWS Utils
var swsInterface = require('../lib/swsInterface');

// SWS API Stats
var swsAPIStats = require('../lib/swsAPIStats');

setImmediate(function() {

    describe('Baseline test', function () {

        this.timeout(20000);

        var app = null;
        var api = null;

        var apiStatsInitial = null;
        var apiStatsCurrent = null;
        var apiLastErrorsInitial = null;
        var apiLastErrorsCurrent = null;
        var apiLongestReqCurrent = null;
        var apiErrorsCurrent = null;

        var client_error_id = cuid();
        var server_error_id = cuid();
        var long_request_id = cuid();
        var xfwd_request_id = cuid();

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
                                api = supertest.agent(swsTestFixture.SWS_TEST_DEFAULT_URL).auth('swagger-stats','swagger-stats');
                                done();
                            } else {
                                process.env.SWS_TEST_TIMEBUCKET = timeline_bucket_duration;
                                app = require('../examples/testapp/testapp');
                                api = supertest('http://localhost:' + app.app.get('port'));
                                setTimeout(done, 500);
                            }
                        } else {
                            api = supertest(swsTestFixture.SWS_TEST_DEFAULT_URL);
                            done();
                        }
                    });
            });
            it('should collect initial statistics values', function (done) {
                api.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'method'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        apiStatsInitial = res.body;
                        done();
                    });
            });
            it('should collect initial set of last errors', function (done) {
                api.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'lasterrors'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        res.body.should.have.property('lasterrors');
                        apiLastErrorsInitial = res.body.lasterrors;
                        done();
                    });
            });
        });


        describe('Send Test Requests', function () {
            it('/success should respond with 200 Success Response', function (done) {
                api.get('/v2/success')
                    .set('Content-Type', 'text/html')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.text.should.equal('OK');
                        done();
                    });
            });

            it('/redirect should respond with 302 Redirect Response', function (done) {
                api.get('/v2/redirect')
                    .expect(302)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.headers.location.should.equal('/v2/success');
                        done();
                    });
            });

            it('/client_error should respond with 404 Not Found Response', function (done) {
                api.get('/v2/client_error')
                    .set({'x-test-id': client_error_id})
                    .expect(404)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.text.should.equal('Not found');
                        done();
                    });
            });

            it('/server_error should respond with 500 Server Error Response', function (done) {
                api.get('/v2/server_error')
                    .set({'x-test-id': server_error_id})
                    .expect(500)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.text.should.equal('Server Error');
                        done();
                    });
            });
        });

        // Get API Stats, and check that number of requests / responses is correctly calculated
        describe('Check Statistics', function () {

            it('should return collected statistics', function (done) {
                api.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'method'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        apiStatsCurrent = res.body;
                        done();
                    });
            });

            it('should have correct values of statistics: all', function (done) {
                (apiStatsCurrent.all.requests).should.be.equal(apiStatsInitial.all.requests + 4);
                (apiStatsCurrent.all.errors).should.be.equal(apiStatsInitial.all.errors + 2);
                (apiStatsCurrent.all.client_error).should.be.equal(apiStatsInitial.all.client_error + 1);
                (apiStatsCurrent.all.server_error).should.be.equal(apiStatsInitial.all.server_error + 1);
                (apiStatsCurrent.all.total_time).should.be.at.least(apiStatsInitial.all.total_time);
                (apiStatsCurrent.all.max_time).should.be.at.least(apiStatsInitial.all.max_time);
                (apiStatsCurrent.all.avg_time.toFixed(4)).should.be.equal((apiStatsCurrent.all.total_time / apiStatsCurrent.all.requests).toFixed(4));
                done();
            });

            it('should have correct values of statistics: method.GET', function (done) {
                (apiStatsCurrent.method.GET.requests).should.be.equal(apiStatsInitial.method.GET.requests + 4);
                (apiStatsCurrent.method.GET.errors).should.be.equal(apiStatsInitial.method.GET.errors + 2);
                (apiStatsCurrent.method.GET.client_error).should.be.equal(apiStatsInitial.method.GET.client_error + 1);
                (apiStatsCurrent.method.GET.server_error).should.be.equal(apiStatsInitial.method.GET.server_error + 1);
                (apiStatsCurrent.method.GET.total_time).should.be.at.least(apiStatsInitial.method.GET.total_time);
                (apiStatsCurrent.method.GET.max_time).should.be.at.least(apiStatsInitial.method.GET.max_time);
                (apiStatsCurrent.method.GET.avg_time.toFixed(4)).should.be.equal((apiStatsCurrent.method.GET.total_time / apiStatsCurrent.method.GET.requests).toFixed(4));
                done();
            });

            it('should retrirve collected last errors', function (done) {
                api.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'lasterrors'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        res.body.should.have.property('lasterrors');
                        apiLastErrorsCurrent = res.body.lasterrors;
                        done();
                    });
            });

            it('should capture last errors', function (done) {
                (apiLastErrorsCurrent).should.be.instanceof(Array);
                (apiLastErrorsCurrent).should.not.be.empty;
                (apiLastErrorsCurrent).should.have.length.of.at.least(2);
                ((apiLastErrorsCurrent.length == apiLastErrorsInitial.length + 2) || (apiLastErrorsCurrent.length == 100)).should.be.true;
                var len = apiLastErrorsCurrent.length;
                var error_info = apiLastErrorsCurrent[len - 1];
                (error_info.path).should.be.equal('/v2/server_error');
                (error_info.method).should.be.equal('GET');
                (error_info).should.have.property('http');
                (error_info.http).should.have.property('request');
                (error_info.http.request).should.have.property('headers');
                (error_info.http.request.headers).should.have.property('x-test-id');
                (error_info.http.request.headers['x-test-id']).should.be.equal(server_error_id);
                error_info = apiLastErrorsCurrent[len - 2];
                (error_info.path).should.be.equal('/v2/client_error');
                (error_info.method).should.be.equal('GET');
                (error_info).should.have.property('http');
                (error_info.http.request).should.have.property('headers');
                (error_info.http.request.headers).should.have.property('x-test-id');
                (error_info.http.request.headers['x-test-id']).should.be.equal(client_error_id);
                done();
            });

            it('should get collected statistics via module API', function (done) {
                api.get('/stats')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        // TODO Implement in full
                        res.body.should.not.be.empty;

                        done();
                    });
            });


            it('should execute long request', function (done) {
                api.get('/v2/paramstest/200/and/none?delay=500')
                    .set({'x-test-id': long_request_id})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.text.should.equal('{"code":200,"message":"Request Method:GET, params.code: 200"}');
                        done();
                    });
            });

            it('should retrieve longest requests', function (done) {
                api.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'longestreq'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        res.body.should.have.property('longestreq');
                        apiLongestReqCurrent = res.body.longestreq;
                        done();
                    });
            });

            it('should capture longest request', function (done) {
                apiLongestReqCurrent.should.be.instanceof(Array);
                apiLongestReqCurrent.should.not.be.empty;
                apiLongestReqCurrent.should.have.length.of.at.least(1);
                var len = apiLongestReqCurrent.length
                var longest_request = apiLongestReqCurrent[len-1];
                (longest_request).should.have.property('http');
                (longest_request.http).should.have.property('request');
                (longest_request.path).should.be.equal('/v2/paramstest/200/and/none?delay=500');
                (longest_request.method).should.be.equal('GET');
                (longest_request.http.request).should.have.property('headers');
                (longest_request.http.request.headers).should.have.property('x-test-id');
                (longest_request.http.request.headers['x-test-id']).should.be.equal(long_request_id);
                (longest_request).should.have.property('responsetime');
                (longest_request.responsetime).should.be.at.least(500);
                done();
            });

            it('should process x-forwarded-for', function (done) {
                api.get('/v2/paramstest/404/and/none')
                    .set({'x-test-id': xfwd_request_id})
                    .set({'x-forwarded-for': '1.1.1.1'})
                    .expect(404)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.text.should.equal('{"code":404,"message":"Request Method:GET, params.code: 404"}');
                        done();
                    });
            });

            it('should retrieve last error with x-forwarded-for', function (done) {
                api.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'lasterrors'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        res.body.should.have.property('lasterrors');
                        apiLastErrorsCurrent = res.body.lasterrors;
                        done();
                    });
            });

            it('should capture remoteaddress from x-forwarded-for', function (done) {
                (apiLastErrorsCurrent).should.be.instanceof(Array);
                (apiLastErrorsCurrent).should.not.be.empty;
                var len = apiLastErrorsCurrent.length;
                var error_info = apiLastErrorsCurrent[len - 1];
                (error_info.http.request.headers).should.have.property('x-test-id');
                (error_info.http.request.headers['x-test-id']).should.be.equal(xfwd_request_id);
                (error_info).should.have.property('real_ip');
                (error_info.real_ip).should.be.equal('1.1.1.1');
                done();
            });

            it('should retrieve errors stats', function (done) {
                api.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'errors'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        res.body.should.have.property('errors');
                        apiErrorsCurrent = res.body.lasterrors;
                        done();
                    });
            });

            // TODO Check errors content


        });

        // Get API Stats, and check that number of requests / responses is correctly calculated
        describe('Check Metrics', function () {

            it('should return metrics', function (done) {
                api.get(swsTestFixture.SWS_TEST_METRICS_API)
                    .expect(200)
                    .expect('Content-Type', /plain/)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.text.should.not.be.empty;

                        // TODO Validate metric values

                        done();
                    });
            });

        });

        // swsUtils
        describe('Check swsUtils', function () {

            it('should convert data to string by type', function (done) {
                swsUtil.swsStringValue("test").should.equal("test");
                swsUtil.swsStringValue(true).should.equal("true");
                swsUtil.swsStringValue(12345).should.equal("12345");
                swsUtil.swsStringValue(null).should.equal('');
                swsUtil.swsStringValue().should.equal('');
                swsUtil.swsStringValue({test:"test"}).should.equal(JSON.stringify({test:"test"}));

                var me = { id: 1, name: 'Luke'};
                var him = { id:2, name: 'Darth Vader'};
                me.father = him;
                him.father = me; // time travel assumed :-)
                swsUtil.swsStringValue(me).should.equal('');
                done();
            });

            it('should return status code class', function (done) {
                swsUtil.getStatusCodeClass(100).should.equal("info");
                swsUtil.getStatusCodeClass(200).should.equal("success");
                swsUtil.getStatusCodeClass(201).should.equal("success");
                swsUtil.getStatusCodeClass(300).should.equal("redirect");
                swsUtil.getStatusCodeClass(302).should.equal("redirect");
                swsUtil.getStatusCodeClass(400).should.equal("client_error");
                swsUtil.getStatusCodeClass(404).should.equal("client_error");
                swsUtil.getStatusCodeClass(500).should.equal("server_error");
                swsUtil.getStatusCodeClass(501).should.equal("server_error");
                done();
            });

        });

        // Get API Stats, and check that number of requests / responses is correctly calculated
        describe('Check Embedded UX', function () {

            it('should return HTML for embedded UX', function (done) {
                api.get(swsTestFixture.SWS_TEST_UX)
                    .expect(200)
                    .expect('Content-Type', /html/)
                    .end(function (err, res) {
                        if (err) return done(err);
                        done();
                    });
            });

        });

    });

    run();

});

