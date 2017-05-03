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


describe('API core test', function () {

    describe('Initialize', function () {
        it('should load swagger spec', function (done) {
            parser.validate(swaggerSpecUrl,function(err, api) {
                if (err) {
                    debug('Error validating swagger spec: ' + err);
                    return done(err);

                }else {
                    debug('Success validating swagger spec!');
                    swaggerSpec = api;
                }
                done();
            });
        });
        it('should initialize spectest app', function (done) {
            supertest(swsTestFixture.SWS_TEST_DEFAULT_URL).get(swsTestFixture.SWS_TEST_STATS_API)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        process.env.SWS_SPECTEST_URL = swaggerSpecUrl;
                        app = require('../examples/spectest/spectest');
                        api = supertest('http://localhost:' + app.app.get("port"));
                        setTimeout(done,500);
                    } else {
                        api = supertest(swsTestFixture.SWS_TEST_DEFAULT_URL);
                        done();
                    }
                });
        });
        it('should collect initial statistics values', function (done) {
            api.get(swsTestFixture.SWS_TEST_STATS_API)
                .query({fields:'apidefs,apistats'})
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

        it('should find each path/method from swagger spec in stats', function (done) {

            // Loop over all requests
            var basePath = swsTestUtils.getApiBasePath(swaggerSpec);

            // getApiFullPath
            for(var path in swaggerSpec.paths ){

                var pathDef = swaggerSpec.paths[path];

                // Create full path
                var fullPath = swsTestUtils.getApiFullPath(basePath, path);

                var operations = ['get','put','post','delete','options','head','patch'];
                for(var i=0;i<operations.length;i++){
                    var op = operations[i];
                    if(op in pathDef) {
                        var opDef = pathDef[op];
                        var opMethod = op.toUpperCase();

                        debug('Detected: %s %s', opMethod, path );

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

        it('should calculate statistics for each path/method from swagger spec', function (done) {

            // Loop over all requests
            var basePath = swsTestUtils.getApiBasePath(swaggerSpec);
            debug('BasePath: %s',basePath);

            var reqCntr = 0;

            // getApiFullPath
            for(var path in swaggerSpec.paths ){

                var pathDef = swaggerSpec.paths[path];

                // Create full path
                var fullPath = swsTestUtils.getApiFullPath(basePath, path);
                debug('fullPath: %s',fullPath);

                var operations = ['get','put','post','delete','options','head','patch'];

                for(var i=0;i<operations.length;i++){
                    var op = operations[i];
                    if(op in pathDef) {
                        var opDef = pathDef[op];
                        var opMethod = op.toUpperCase();

                        debug('Checking: %s %s', opMethod, path );

                        // Extract all parameters
                        var opParams = swsTestUtils.extractApiOpParameters(swaggerSpec,pathDef,opDef);
                        debug('Parameters: %s', JSON.stringify(opParams));

                        // Call Definition
                        var opCallDef = swsTestUtils.generateApiOpCallDef(swaggerSpec,pathDef,opDef,op,fullPath,opParams);
                        debug('opCallDef: %s', JSON.stringify(opCallDef));

                        // Generate request
                        var xswsResHdr = JSON.stringify({code:200,message:"OK",delay:0,payloadsize:0});

                        debug('>>>>> %s %s', opCallDef.method, opCallDef.uri );
                        reqCntr++;
                        api[opCallDef.method](opCallDef.uri )
                            .query(opCallDef.query)
                            .set({'x-sws-res':xswsResHdr})
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    debug('ERROR executing request: %s %s', opCallDef.method, opCallDef.uri );
                                    return done(err);
                                }
                                reqCntr--;
                                if(reqCntr==0){
                                    done();
                                }
                            });
                    }
                }
            }
        });

    });

    describe('Teardown', function () {
        it('should teardown test app', function (done) {
            if(app==null){
                done();
            }else{
                app.teardown(function(){
                    done();
                });
            }
        });
    });

});
