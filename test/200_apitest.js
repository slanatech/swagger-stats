'use strict';
var chai = require('chai');
chai.should();
var expect = chai.expect;
var supertest = require('supertest');
var cuid = require('cuid');
var swaggerParser = require('swagger-parser');

var debug = require('debug')('swstest:apitest');

// SWS test fixture
var swsTestFixture = require('./testfixture');

var app = null;
var api = null;

var apiStatsInitial = null;
var apiStatsCurrent = null;
var apiLastErrorsInitial = null;
var apiLastErrorsCurrent = null;

var client_error_id = cuid();
var server_error_id = cuid();

//var swaggerSpecUrl = './examples/spectest/specs/amadeus.com/1.2/swagger.yaml';
var swaggerSpecUrl = './examples/spectest/specs/appveyor.com/0.20170106.0/swagger.yaml';

var swaggerSpec = null;
var parser = new swaggerParser();

function getApiBasePath(swaggerSpec){
    var basePath = swaggerSpec.basePath ? swaggerSpec.basePath : '/';
    if (basePath.charAt(0) !== '/') {
        basePath = '/' + basePath;
    }
    if (basePath.charAt(basePath.length - 1) !== '/') {
        basePath = basePath + '/';
    }
    return basePath;
}

function getApiFullPath(basepath, path){
    var fullPath = basepath;
    if (path.charAt(0) === '/') {
        fullPath += path.substring(1);
    }else{
        fullPath += path;
    }
    return fullPath;
}

describe('API statistics test', function () {

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
            supertest(swsTestFixture.SWS_TEST_DEFAULT_URL).get('/swagger-stats/data')
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

    describe('Inspect Swagger API entries in statistics', function () {
        it('should find each path/method from swagger spec in stats', function (done) {

            // Loop over all requests
            var basePath = getApiBasePath(swaggerSpec);

            // getApiFullPath
            for(var path in swaggerSpec.paths ){

                var pathDef = swaggerSpec.paths[path];

                // Create full path
                var fullPath = getApiFullPath(basePath, path);

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
    });

    describe('Teardown', function () {
        it('should teardown spectest app', function (done) {
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
