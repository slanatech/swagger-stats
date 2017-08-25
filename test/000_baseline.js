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

var uiMarkup = swsUtil.swsEmbeddedUIMarkup;

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

// TEST UI Index file
var testUIIndex = fs.readFileSync( path.join(__dirname,'..','ui','index.html') ).toString();


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
                (error_info.http.request.url).should.be.equal('/server_error');
                (error_info.path).should.be.equal('/api/v1/server_error');
                (error_info.method).should.be.equal('GET');
                (error_info).should.have.property('http');
                (error_info.http).should.have.property('request');
                (error_info.http.request).should.have.property('headers');
                (error_info.http.request.headers).should.have.property('x-test-id');
                (error_info.http.request.headers['x-test-id']).should.be.equal(server_error_id);
                error_info = apiLastErrorsCurrent[len - 2];
                (error_info.http.request.url).should.be.equal('/client_error');
                (error_info.path).should.be.equal('/api/v1/client_error');
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
                api.get('/api/v1/paramstest/200/and/none?delay=500')
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
                (longest_request.http.request.url).should.be.equal('/paramstest/200/and/none?delay=500');
                (longest_request.path).should.be.equal('/api/v1/paramstest/200/and/none?delay=500');
                (longest_request.method).should.be.equal('GET');
                (longest_request.http.request).should.have.property('headers');
                (longest_request.http.request.headers).should.have.property('x-test-id');
                (longest_request.http.request.headers['x-test-id']).should.be.equal(long_request_id);
                (longest_request).should.have.property('responsetime');
                (longest_request.responsetime).should.be.at.least(500);
                done();
            });

            it('should process x-forwarded-for', function (done) {
                api.get('/api/v1/paramstest/404/and/none')
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
        describe('Check swsAPIStats', function () {

            var apistats = new swsAPIStats();

            it('should not return data for unknown operation', function (done) {
                expect(apistats.getAPIOperationStats()).to.deep.equal({});
                expect(apistats.getAPIOperationStats('GET')).to.deep.equal({});
                expect(apistats.getAPIOperationStats('GET','/unknown')).to.deep.equal({'GET':{'/unknown':{}}});
                done();
            });

            it('should not initialize without Swagger spec', function (done) {
                apistats.initialize();
                apistats.initialize(null);
                apistats.initialize({});
                apistats.initialize({swaggerSpec:null});
                apistats.initialize({swaggerSpec:{}});
                expect(apistats.apiMatchIndex).to.deep.equal({});
                expect(apistats.apidefs).to.deep.equal({});
                expect(apistats.apistats).to.deep.equal({});
                expect(apistats.apidetails).to.deep.equal({});
                done();
            });

            it('should initialize basePath from Swagger spec', function (done) {
                apistats.initialize({swaggerSpec:{basePath:'/base'}});
                expect(apistats.basePath).to.equal('/base/');
                apistats.initialize({swaggerSpec:{basePath:'base'}});
                expect(apistats.basePath).to.equal('/base/');
                apistats.initialize({swaggerSpec:{basePath:'base/'}});
                expect(apistats.basePath).to.equal('/base/');
                apistats.initialize({swaggerSpec:{basePath:'/base/'}});
                expect(apistats.basePath).to.equal('/base/');
                apistats.initialize({swaggerSpec:{basePath:'/'}});
                expect(apistats.basePath).to.equal('/');
                apistats.initialize({swaggerSpec:{basePath:''}});
                expect(apistats.basePath).to.equal('/');
                apistats.initialize({swaggerSpec:{basePath:null}});
                expect(apistats.basePath).to.equal('/');
                expect(apistats.getFullPath('test')).to.equal('/test');
                expect(apistats.getFullPath('/test')).to.equal('/test');
                apistats.initialize({swaggerSpec:{basePath:'base'}});
                expect(apistats.basePath).to.equal('/base/');
                expect(apistats.getFullPath('test')).to.equal('/base/test');
                expect(apistats.getFullPath('/test')).to.equal('/base/test');
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

            it('should redirect to test UI', function (done) {
                api.get('/')
                    .expect(302)
                    .end(function (err, res) {
                        if (err) return done(err);
                        done();
                    });
            });

            it('should return HTML for test UI', function (done) {
                api.get(swsTestFixture.SWS_TEST_UI)
                    .expect(200)
                    .expect('Content-Type', /html/)
                    .end(function (err, res) {
                        if (err) return done(err);
                        res.text.should.be.equal(testUIIndex);
                        done();
                    });
            });

            it('should return swagger spec of test app', function (done) {
                api.get('/apidoc.json')
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        if (err) return done(err);
                        done();
                    });
            });

        });

    });

    run();

});

