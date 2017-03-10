'use strict';
var chai = require('chai');
chai.should();
var expect = chai.expect;
var supertest = require('supertest');
var cuid = require('cuid');

// SWS test fixture
var swsTestFixture = require('./testfixture');

var api = null;

var apiStatsInitial = null;
var apiStatsCurrent = null;

var client_error_id = cuid();
var server_error_id = cuid();


describe('Baseline statistics test', function () {

   describe('Initialize', function(){
        it('should initialize example app', function (done) {
            supertest(swsTestFixture.SWS_TEST_DEFAULT_URL).get('/swagger-stats/data')
                .expect(200)
                .end(function (err, res) {
                    if (err){
                        var app = require('../example/app');
                        api = supertest('http://localhost:' + app.get('port'));
                    }else{
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
                .set({'x-test-id':client_error_id})
                .expect(404)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.text.should.equal('Not found');
                    done();
                });
        });

        it('/server_error should respond with 500 Server Error Response', function (done) {
            api.get('/api/v1/server_error')
                .set({'x-test-id':server_error_id})
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
            (apiStatsCurrent.all.requests).should.be.equal(apiStatsInitial.all.requests+4);
            (apiStatsCurrent.all.responses).should.be.equal(apiStatsInitial.all.responses+4);
            (apiStatsCurrent.all.client_error).should.be.equal(apiStatsInitial.all.client_error+1);
            (apiStatsCurrent.all.server_error).should.be.equal(apiStatsInitial.all.server_error+1);
            (apiStatsCurrent.all.total_time).should.be.at.least(apiStatsInitial.all.total_time);
            (apiStatsCurrent.all.max_time).should.be.at.least(apiStatsInitial.all.max_time);
            (apiStatsCurrent.all.avg_time.toFixed(4)).should.be.equal((apiStatsCurrent.all.total_time/apiStatsCurrent.all.requests).toFixed(4));
            done();
        });

        it('should have correct values of statistics: method.GET', function (done) {
            (apiStatsCurrent.method.GET.requests).should.be.equal(apiStatsInitial.method.GET.requests+4);
            (apiStatsCurrent.method.GET.responses).should.be.equal(apiStatsInitial.method.GET.responses+4);
            (apiStatsCurrent.method.GET.client_error).should.be.equal(apiStatsInitial.method.GET.client_error+1);
            (apiStatsCurrent.method.GET.server_error).should.be.equal(apiStatsInitial.method.GET.server_error+1);
            (apiStatsCurrent.method.GET.total_time).should.be.at.least(apiStatsInitial.method.GET.total_time);
            (apiStatsCurrent.method.GET.max_time).should.be.at.least(apiStatsInitial.method.GET.max_time);
            (apiStatsCurrent.method.GET.avg_time.toFixed(4)).should.be.equal((apiStatsCurrent.method.GET.total_time/apiStatsCurrent.method.GET.requests).toFixed(4));
            done();
        });

        it('should capture last errors', function (done) {
            (apiStatsCurrent.last_errors).should.be.instanceof(Array);
            (apiStatsCurrent.last_errors).should.not.be.empty;
            (apiStatsCurrent.last_errors).should.have.length.of.at.least(2);
            ((apiStatsCurrent.last_errors.length == apiStatsInitial.last_errors.length+2) || (apiStatsCurrent.last_errors.length == 100)).should.be.true;
            var len = apiStatsCurrent.last_errors.length;
            var error_info = apiStatsCurrent.last_errors[len-1];
            (error_info.url).should.be.equal('/server_error');
            (error_info.originalUrl).should.be.equal('/api/v1/server_error');
            (error_info.method).should.be.equal('GET');
            (error_info).should.have.property('headers');
            (error_info.headers).should.have.property('x-test-id');
            (error_info.headers['x-test-id']).should.be.equal(server_error_id);
            error_info = apiStatsCurrent.last_errors[len-2];
            (error_info.url).should.be.equal('/client_error');
            (error_info.originalUrl).should.be.equal('/api/v1/client_error');
            (error_info.method).should.be.equal('GET');
            (error_info).should.have.property('headers');
            (error_info.headers).should.have.property('x-test-id');
            (error_info.headers['x-test-id']).should.be.equal(client_error_id);
            done();
        });

    });

});
