'use strict';
var chai = require('chai');
var supertest = require('supertest');

// TODO Start App from here

var api = supertest('http://localhost:3030');

chai.should();

describe('Response Types', function () {
    describe('/success', function () {
        it('should respond with 200 Success Response', function (done) {
            api.get('/api/v1/success')
                .set('Content-Type', 'text/html')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.text.should.equal('OK');
                    done();
                });
        });
    });

    describe('/redirect', function () {
        it('should respond with 302 Redirect Response', function (done) {
            api.get('/api/v1/redirect')
                .expect(302)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.headers.location.should.equal('/api/v1/success');
                    done();
                });
        });
    });

    describe('/client_error', function () {
        it('should respond with 404 Not Found Response', function (done) {
            api.get('/api/v1/client_error')
                .expect(404)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.text.should.equal('Not found');
                    done();
                });
        });
    });

    describe('/server_error', function () {
        it('should respond with 500 Server Error Response', function (done) {
            api.get('/api/v1/server_error')
                .expect(500)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.text.should.equal('Server Error');
                    done();
                });
        });
    });

    // TODO Get API Stats, and check that number of requests / responses is correctly calculated

});
