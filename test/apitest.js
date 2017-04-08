'use strict';
var chai = require('chai');
chai.should();
var expect = chai.expect;
var supertest = require('supertest');
var cuid = require('cuid');
var swaggerParser = require('swagger-parser');

// SWS test fixture
var swsTestFixture = require('./testfixture');

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
                    console.log('Error validating swagger spec: ' + err);
                    return done(err);

                }else {
                    console.log('Success validating swagger spec!');
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
                        var app = require('../examples/spectest/spectest');
                        api = supertest('http://localhost:' + app.get('port'));
                    } else {
                        api = supertest(swsTestFixture.SWS_TEST_DEFAULT_URL);
                    }
                    done();
                });
        });
        it('should collect initial statistics values', function (done) {
            api.get('/swagger-stats/data')
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

                console.log('Checking: ' + path );
                var pathDef = swaggerSpec.paths[path];

                // Create full path
                var fullPath = getApiFullPath(basePath, path);

                var operations = ['get','put','post','delete','options','head','patch'];
                for(var i=0;i<operations.length;i++){
                    var op = operations[i];
                    if(op in pathDef) {
                        console.log('   ' + op);
                        var opDef = pathDef[op];
                        var opMethod = op.toUpperCase();

                        // We must find the same API (path+method) in swagger-stats
                        apiStatsInitial.api.should.have.property(fullPath);
                        apiStatsInitial.api[fullPath].should.have.property(opMethod);
                        apiStatsInitial.api[fullPath][opMethod].should.have.property('swagger');
                        apiStatsInitial.api[fullPath][opMethod].swagger.should.equal(true);

                        // We must find the same properties of this api def in swagger-stats
                        if ('deprecated' in opDef) {
                            apiStatsInitial.api[fullPath][opMethod].should.have.property('deprecated');
                            apiStatsInitial.api[fullPath][opMethod].deprecated.should.equal(opDef.deprecated);
                        }

                        if ('operationId' in opDef) {
                            apiStatsInitial.api[fullPath][opMethod].should.have.property('operationId');
                            apiStatsInitial.api[fullPath][opMethod].operationId.should.equal(opDef.operationId);
                        }

                        if ('description' in opDef) {
                            apiStatsInitial.api[fullPath][opMethod].should.have.property('description');
                            apiStatsInitial.api[fullPath][opMethod].description.should.equal(opDef.description);
                        }

                        if ('summary' in opDef) {
                            apiStatsInitial.api[fullPath][opMethod].should.have.property('summary');
                            apiStatsInitial.api[fullPath][opMethod].summary.should.equal(opDef.summary);
                        }

                        if ('tags' in opDef) {
                            apiStatsInitial.api[fullPath][opMethod].should.have.property('tags');
                            apiStatsInitial.api[fullPath][opMethod].tags.should.be.eql(opDef.tags);
                            //should(apiStatsInitial.api[fullPath][opMethod].tags.sort()).be.eql(opDef.tags.sort());
                        }
                    }
                }
            }
            done();
        });
    });

/*

    describe('Send Test Requests', function () {
        it('/success should respond with 200 Success Response', function (done) {
            api.get('/api/v1/success')
                .set('Content-Type', 'text/html')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.text.should.equal('OK');
                    done();
                });
        });

        it('/redirect should respond with 302 Redirect Response', function (done) {
            api.get('/api/v1/redirect')
                .expect(302)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.headers.location.should.equal('/api/v1/success');
                    done();
                });
        });

        it('/client_error should respond with 404 Not Found Response', function (done) {
            api.get('/api/v1/client_error')
                .set({'x-test-id': client_error_id})
                .expect(404)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.text.should.equal('Not found');
                    done();
                });
        });

        it('/server_error should respond with 500 Server Error Response', function (done) {
            api.get('/api/v1/server_error')
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
            api.get('/swagger-stats/data')
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
            api.get('/swagger-stats/data/lasterrors')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.should.not.be.empty;
                    apiLastErrorsCurrent = res.body;
                    done();
                });
        });

        it('should capture last errors', function (done) {
            (apiLastErrorsCurrent.last_errors).should.be.instanceof(Array);
            (apiLastErrorsCurrent.last_errors).should.not.be.empty;
            (apiLastErrorsCurrent.last_errors).should.have.length.of.at.least(2);
            ((apiLastErrorsCurrent.last_errors.length == apiLastErrorsInitial.last_errors.length + 2) || (apiLastErrorsCurrent.last_errors.length == 100)).should.be.true;
            var len = apiLastErrorsCurrent.last_errors.length;
            var error_info = apiLastErrorsCurrent.last_errors[len - 1];
            (error_info.url).should.be.equal('/server_error');
            (error_info.originalUrl).should.be.equal('/api/v1/server_error');
            (error_info.method).should.be.equal('GET');
            (error_info).should.have.property('req_headers');
            (error_info.req_headers).should.have.property('x-test-id');
            (error_info.req_headers['x-test-id']).should.be.equal(server_error_id);
            error_info = apiLastErrorsCurrent.last_errors[len - 2];
            (error_info.url).should.be.equal('/client_error');
            (error_info.originalUrl).should.be.equal('/api/v1/client_error');
            (error_info.method).should.be.equal('GET');
            (error_info).should.have.property('req_headers');
            (error_info.req_headers).should.have.property('x-test-id');
            (error_info.req_headers['x-test-id']).should.be.equal(client_error_id);
            done();
        });

    });
*/
});
