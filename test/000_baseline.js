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

var uiMarkup = swsUtil.swsEmbeddedUIMarkup;

var app = null;
var api = null;

var apiStatsInitial = null;
var apiStatsCurrent = null;
var apiLastErrorsInitial = null;
var apiLastErrorsCurrent = null;

var client_error_id = cuid();
var server_error_id = cuid();

// 1 second
var timeline_bucket_duration = 1000;

// All files from /dist
var distFiles = [];

function readFiles(basePath, folder) {

    var files = fs.readdirSync( path.join(basePath, folder) );

    for(var i=0;i<files.length;i++){

        var fn = files[i];

        var fileContent = fs.readFileSync( path.join(basePath, folder, fn) );

        var fileUrl = folder + '/' + fn;
        var contentType = '';
        if( fn.endsWith('css') ) contentType = /css/;
        if( fn.endsWith('js') ) contentType = /javascript/;
        if( fn.endsWith('woff') ) contentType = /woff/;
        if( fn.endsWith('woff2') ) contentType = /woff2/;
        if( fn.endsWith('otf') ) contentType = /opentype/;
        if( fn.endsWith('svg') ) contentType = /svg/;
        if( fn.endsWith('ttf') ) contentType = /ttf/;
        if( fn.endsWith('eot') ) contentType = /fontobject/;
        if( fn.endsWith('map') ) contentType = /json/;

        var fileInfo = { url: fileUrl, contentType: contentType,  content: fileContent };
        distFiles.push(fileInfo);
    }
}

var distBasePath = path.join(__dirname,'..','dist');

readFiles( distBasePath, 'js' );
readFiles( distBasePath, 'css' );
readFiles( distBasePath, 'fonts' );
readFiles( distBasePath, 'maps' );

setImmediate(function() {

    describe('Baseline test', function () {

        this.timeout(20000);

        describe('Initialize', function () {
            it('should initialize example app', function (done) {
                supertest(swsTestFixture.SWS_TEST_DEFAULT_URL).get(swsTestFixture.SWS_TEST_STATS_API)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            process.env.SWS_TEST_TIMEBUCKET = timeline_bucket_duration;
                            app = require('../examples/testapp/testapp');
                            api = supertest('http://localhost:' + app.app.get('port'));
                            setTimeout(done, 500);
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
                (error_info.url).should.be.equal('/server_error');
                (error_info.originalUrl).should.be.equal('/api/v1/server_error');
                (error_info.method).should.be.equal('GET');
                (error_info).should.have.property('req');
                (error_info.req).should.have.property('headers');
                (error_info.req.headers).should.have.property('x-test-id');
                (error_info.req.headers['x-test-id']).should.be.equal(server_error_id);
                error_info = apiLastErrorsCurrent[len - 2];
                (error_info.url).should.be.equal('/client_error');
                (error_info.originalUrl).should.be.equal('/api/v1/client_error');
                (error_info.method).should.be.equal('GET');
                (error_info).should.have.property('req');
                (error_info.req).should.have.property('headers');
                (error_info.req.headers).should.have.property('x-test-id');
                (error_info.req.headers['x-test-id']).should.be.equal(client_error_id);
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

        });

        // Get API Stats, and check that number of requests / responses is correctly calculated
        describe('Check swsUtils', function () {

            it('should convert data to string by type', function (done) {
                swsUtil.swsStringValue("test").should.equal("test");
                swsUtil.swsStringValue(true).should.equal("true");
                swsUtil.swsStringValue(12345).should.equal("12345");
                swsUtil.swsStringValue(null).should.equal('');
                swsUtil.swsStringValue().should.equal('');
                swsUtil.swsStringValue({test:"test"}).should.equal(JSON.stringify({test:"test"}));
                done();
            });
        });

        // Get API Stats, and check that number of requests / responses is correctly calculated
        describe('Check Embedded UI', function () {

            it('should return HTML for embedded UI', function (done) {
                api.get(swsTestFixture.SWS_TEST_STATS_UI)
                    .expect(200)
                    .expect('Content-Type', /html/)
                    .end(function (err, res) {
                        if (err) return done(err);
                        res.text.should.be.equal(uiMarkup);
                        done();
                    });
            });

            distFiles.forEach(function(fileInfo) {

                it('should return embedded UI file /dist/'+fileInfo.url, function (done) {
                    api.get(swsTestFixture.SWS_TEST_STATS_DIST + '/' + fileInfo.url + '?test')
                        .expect(200)
                        .expect('Content-Type', fileInfo.contentType )
                        .end(function (err, res) {
                            if (err) return done(err);
                            var cl = parseInt(res.header['content-length']);
                            cl.should.equal(fileInfo.content.length);
                            done();
                        });
                });


            });

        });

    });

    run();

});

