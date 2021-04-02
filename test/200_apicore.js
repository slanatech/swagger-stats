'use strict';
var chai = require('chai');
chai.should();
var expect = chai.expect;

var http = require('http');
var supertest = require('supertest');
var cuid = require('cuid');
var swaggerParser = require('swagger-parser');

var debug = require('debug')('swstest:apicore');

var swsTestFixture = require('./testfixture');
var swsTestUtils = require('./testutils');

// SWS Utils
var swsUtil = require('../lib/swsUtil');
var uiMarkup = swsUtil.swsEmbeddedUIMarkup;

var swaggerSpecUrl = './examples/spectest/petstore3.yaml';   // Default
if( process.env.SWS_SPECTEST_URL ){
    swaggerSpecUrl = process.env.SWS_SPECTEST_URL;
}
debug('Using Swagger Specification: %s', swaggerSpecUrl);

//https://api.apis.guru/v2/specs/amazonaws.com/rekognition/2016-06-27/swagger.json

var swaggerSpec = null;
var parser = new swaggerParser();

var test_array = {'GET /opa':["1"],'POST /opa':["2"],'PUT /opa':["3"]};

var apiOperationsList = [];

// First we need to load and validate swagger spec
// Then we can generate dynamic it tests based on results of swagger spec analysis
// Use --delay mocha flag

parser.validate(swaggerSpecUrl, function (err, api) {

    if (err) {
        debug('Error validating swagger spec: ' + err);
        return;
    }

    swaggerSpec = api;
    apiOperationsList = swsTestUtils.generateApiOpList(swaggerSpec);

    describe('API core test', function () {

        this.timeout(15000);

        var appSpecTest = null;
        var apiSpecTest = null;

        var apiStatsInitial = null;
        var apiStatsCurrent = null;
        var apiLastErrorsInitial = null;
        var apiLastErrorsCurrent = null;

        var client_error_id = cuid();
        var server_error_id = cuid();


        describe('Initialize', function () {

            it('should initialize spectest app', function (done) {
                supertest(swsTestFixture.SWS_SPECTEST_DEFAULT_URL).get(swsTestFixture.SWS_TEST_STATS_API)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            if( res && res.status === 403 ){
                                apiSpecTest = supertest.agent(swsTestFixture.SWS_TEST_DEFAULT_URL).auth('swagger-stats','swagger-stats');
                                done();
                            } else {
                                process.env.SWS_SPECTEST_URL = swaggerSpecUrl;
                                appSpecTest = require('../examples/spectest/spectest');
                                apiSpecTest = supertest('http://localhost:' + appSpecTest.app.get("port"));
                                setTimeout(done, 500);
                            }
                        } else {
                            apiSpecTest = supertest(swsTestFixture.SWS_SPECTEST_DEFAULT_URL);
                            done();
                        }
                    });
            });

            it('should collect initial statistics values', function (done) {
                apiSpecTest.get(swsTestFixture.SWS_TEST_STATS_API)
                    .query({fields: 'apidefs,apistats'})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        res.body.should.not.be.empty;
                        apiStatsInitial = res.body;
                        done();
                    });
            });
        });

        describe('Inspect API statistics', function () {

            it('should find each API operation from swagger spec in stats', function (done) {

                // Loop over all requests
                var basePath = swsTestUtils.getApiBasePath(swaggerSpec);

                // getApiFullPath
                for (var path in swaggerSpec.paths) {

                    var pathDef = swaggerSpec.paths[path];

                    // Create full path
                    var fullPath = swsTestUtils.getApiFullPath(basePath, path);

                    var operations = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
                    for (var i = 0; i < operations.length; i++) {
                        var op = operations[i];
                        if (op in pathDef) {
                            var opDef = pathDef[op];
                            var opMethod = op.toUpperCase();

                            debug('Detected: %s %s', opMethod, path);

                            // We must find the same API (path+method) in swagger-stats
                            apiStatsInitial.apidefs.should.have.property(fullPath);
                            apiStatsInitial.apidefs[fullPath].should.have.property(opMethod);

                            apiStatsInitial.apistats.should.have.property(fullPath);
                            apiStatsInitial.apistats[fullPath].should.have.property(opMethod);

                            apiStatsInitial.apidefs[fullPath][opMethod].should.have.property('swagger');
                            apiStatsInitial.apidefs[fullPath][opMethod].swagger.should.equal(true);

                            // We must find the same properties of this api def in swagger-stats
                            if ('deprecated' in opDef) {
                                apiStatsInitial.apidefs[fullPath][opMethod].should.have.property('deprecated');
                                apiStatsInitial.apidefs[fullPath][opMethod].deprecated.should.equal(opDef.deprecated);
                            }

                            if ('operationId' in opDef) {
                                apiStatsInitial.apidefs[fullPath][opMethod].should.have.property('operationId');
                                apiStatsInitial.apidefs[fullPath][opMethod].operationId.should.equal(opDef.operationId);
                            }

                            if ('description' in opDef) {
                                apiStatsInitial.apidefs[fullPath][opMethod].should.have.property('description');
                                apiStatsInitial.apidefs[fullPath][opMethod].description.should.equal(opDef.description);
                            }

                            if ('summary' in opDef) {
                                apiStatsInitial.apidefs[fullPath][opMethod].should.have.property('summary');
                                apiStatsInitial.apidefs[fullPath][opMethod].summary.should.equal(opDef.summary);
                            }

                            if ('tags' in opDef) {
                                apiStatsInitial.apidefs[fullPath][opMethod].should.have.property('tags');
                                apiStatsInitial.apidefs[fullPath][opMethod].tags.should.be.eql(opDef.tags);
                                //should(apiStatsInitial.api[fullPath][opMethod].tags.sort()).be.eql(opDef.tags.sort());
                            }
                        }
                    }
                }
                done();
            });
        });

        describe('Validate statistics for each API Operations', function () {

            var simulatedRequests = [
                {name:'success',hdr:{code: 200, message: "OK", delay: 0, payloadsize: 0}},
                {name:'redirect',hdr:{code: 302, message: "Moved", delay: 0, payloadsize: 50}},
                {name:'client error',hdr:{code: 404, message: "Not Found", delay: 0, payloadsize: 200}},
                {name:'server error',hdr:{code: 500, message: "Server Error", delay: 10, payloadsize: 300}}
            ];

            var apiOpStatsInitial = null;
            var apiOpStatsUpdated = null;

            apiOperationsList.forEach(function(apiop){

                it('should retrieve initial statistics for ' + apiop.label, function (done) {
                    apiSpecTest.get(swsTestFixture.SWS_TEST_STATS_API)
                        .query({fields: 'apiop', method: apiop.method, path:apiop.path })
                        .expect(200)
                        .end(function (err, res) {
                            if (err) return done(err);

                            res.body.should.not.be.empty;

                            var stats = res.body;
                            stats.should.have.property('all');
                            stats.should.have.property('apiop');
                            stats.apiop.should.have.property(apiop.path);
                            stats.apiop[apiop.path].should.have.property(apiop.method);

                            var opstats = stats.apiop[apiop.path][apiop.method];

                            opstats.should.have.property('defs');
                            opstats.should.have.property('details');
                            opstats.should.have.property('stats');

                            apiOpStatsInitial = opstats.stats;

                            debug('INITIAL STATS: %s', JSON.stringify(apiOpStatsInitial));
                            done();
                        });
                });

                simulatedRequests.forEach(function(reqdef){
                    it('should simulate '+ reqdef.name +' for ' + apiop.label, function (done) {
                        // Generate request
                        var opCallDef = apiop.opCallDef;
                        var xswsResHdr = JSON.stringify(reqdef.hdr);
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
                        const req = http.request(options, function(res){
                            res.should.have.property('statusCode');
                            res.statusCode.should.be.equal(reqdef.hdr.code);
                            done();
                        });
                        req.end();
                    });
                });

                it('should retrieve current statistics for ' + apiop.label, function (done) {
                    apiSpecTest.get(swsTestFixture.SWS_TEST_STATS_API)
                        .query({fields: 'apiop', method: apiop.method, path:apiop.path })
                        .expect(200)
                        .end(function (err, res) {
                            if (err) return done(err);

                            res.body.should.not.be.empty;

                            var stats = res.body;
                            stats.should.have.property('all');
                            stats.should.have.property('apiop');
                            stats.apiop.should.have.property(apiop.path);
                            stats.apiop[apiop.path].should.have.property(apiop.method);

                            var opstats = stats.apiop[apiop.path][apiop.method];

                            opstats.should.have.property('defs');
                            opstats.should.have.property('details');
                            opstats.should.have.property('stats');

                            apiOpStatsUpdated = opstats.stats;

                            debug('CURRENT STATS: %s', JSON.stringify(apiOpStatsUpdated));
                            done();
                        });
                });

                // Check statistics values
                it('should have correct statistics values for ' + apiop.label, function (done) {

                    (apiOpStatsUpdated.requests).should.be.equal(apiOpStatsInitial.requests + 4);
                    (apiOpStatsUpdated.responses).should.be.equal(apiOpStatsInitial.responses + 4);
                    (apiOpStatsUpdated.errors).should.be.equal(apiOpStatsInitial.errors + 2);
                    (apiOpStatsUpdated.success).should.be.equal(apiOpStatsInitial.success + 1);
                    (apiOpStatsUpdated.redirect).should.be.equal(apiOpStatsInitial.redirect + 1);
                    (apiOpStatsUpdated.client_error).should.be.equal(apiOpStatsInitial.client_error + 1);
                    (apiOpStatsUpdated.server_error).should.be.equal(apiOpStatsInitial.server_error + 1);
                    (apiOpStatsUpdated.total_time).should.be.at.least(apiOpStatsInitial.total_time);
                    (apiOpStatsUpdated.max_time).should.be.at.least(apiOpStatsInitial.max_time);
                    (apiOpStatsUpdated.avg_time.toFixed(4)).should.be.equal((apiOpStatsUpdated.total_time / apiOpStatsUpdated.requests).toFixed(4));
                    (apiOpStatsUpdated.total_req_clength).should.be.at.least(apiOpStatsInitial.total_req_clength);
                    (apiOpStatsUpdated.max_req_clength).should.be.at.least(apiOpStatsInitial.max_req_clength);
                    (apiOpStatsUpdated.avg_req_clength.toFixed(4)).should.be.equal((apiOpStatsUpdated.total_req_clength / apiOpStatsUpdated.requests).toFixed(4));
                    (apiOpStatsUpdated.total_res_clength).should.be.at.least(apiOpStatsInitial.total_res_clength+100);
                    (apiOpStatsUpdated.max_res_clength).should.be.at.least(apiOpStatsInitial.max_res_clength);
                    (apiOpStatsUpdated.avg_res_clength+10).should.be.at.least((apiOpStatsUpdated.total_res_clength / apiOpStatsUpdated.responses));
                    done();

                });
            });

        });


        // Check that metrics are returned, using both prom-client and internal implementations
        describe('Check Metrics', function () {

            it('should return Prometheus metrics', function (done) {
                apiSpecTest.get(swsTestFixture.SWS_TEST_METRICS_API)
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

    });

    run();
});




