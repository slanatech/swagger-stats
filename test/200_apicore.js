'use strict';
var chai = require('chai');
chai.should();
var expect = chai.expect;

var supertest = require('supertest');
var cuid = require('cuid');
var swaggerParser = require('swagger-parser');

var debug = require('debug')('swstest:apitest');

var swsTestFixture = require('./testfixture');
var swsTestUtils = require('./testutils');

var app = null;
var api = null;

var apiStatsInitial = null;
var apiStatsCurrent = null;
var apiLastErrorsInitial = null;
var apiLastErrorsCurrent = null;

var client_error_id = cuid();
var server_error_id = cuid();

var swaggerSpecUrl = './examples/spectest/petstore.yaml';

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

        describe('Initialize', function () {

            it('should initialize spectest app', function (done) {
                supertest(swsTestFixture.SWS_TEST_DEFAULT_URL).get(swsTestFixture.SWS_TEST_STATS_API)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            process.env.SWS_SPECTEST_URL = swaggerSpecUrl;
                            app = require('../examples/spectest/spectest');
                            api = supertest('http://localhost:' + app.app.get("port"));
                            setTimeout(done, 500);
                        } else {
                            api = supertest(swsTestFixture.SWS_TEST_DEFAULT_URL);
                            done();
                        }
                    });
            });

            it('should collect initial statistics values', function (done) {
                api.get(swsTestFixture.SWS_TEST_STATS_API)
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
                {name:'redirect',hdr:{code: 302, message: "Moved", delay: 0, payloadsize: 0}},
                {name:'client error',hdr:{code: 404, message: "Not Found", delay: 0, payloadsize: 0}},
                {name:'server error',hdr:{code: 500, message: "Server Error", delay: 0, payloadsize: 0}}
            ];

            apiOperationsList.forEach(function(apiop){

                simulatedRequests.forEach(function(reqdef){
                    it('should simulate '+ reqdef.name +' for ' + apiop.label, function (done) {
                        // Generate request
                        var opCallDef = apiop.opCallDef;
                        var xswsResHdr = JSON.stringify(reqdef.hdr);
                        debug('>>>>> %s %s query:%s x-sws-res:%s', opCallDef.method, opCallDef.uri, JSON.stringify(opCallDef.query), xswsResHdr);
                        api[opCallDef.method](opCallDef.uri)
                            .query(opCallDef.query)
                            .set({'x-sws-res': xswsResHdr})
                            .expect(reqdef.hdr.code)
                            .end(function (err, res) {
                                if (err) {
                                    debug('ERROR executing request: %s %s', opCallDef.method, opCallDef.uri);
                                    return done(err);
                                }
                                done();
                            });
                    });
                });

                it('should retrieve statistics for ' + apiop.label, function (done) {
                    api.get(swsTestFixture.SWS_TEST_STATS_API)
                        .query({fields: 'apiop', method: apiop.method, path:apiop.path })
                        .expect(200)
                        .end(function (err, res) {
                            if (err) return done(err);

                            res.body.should.not.be.empty;
                            var apiOpStats = res.body;
                            debug('STATS: %s', JSON.stringify(apiOpStats));
                            done();
                        });
                });

                // TODO Check statistics values

            });

        });

        describe('Teardown', function () {
            it('should teardown test app', function (done) {
                if (app == null) {
                    done();
                } else {
                    app.teardown(function () {
                        done();
                    });
                }
            });
        });

    });

    run();
});




