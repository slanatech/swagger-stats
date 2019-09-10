'use strict';
var chai = require('chai');
chai.should();
var expect = chai.expect;
var supertest = require('supertest');

var swsTestFixture = require('./testfixture');


setImmediate(function() {

    describe('Stop Test App', function () {
        it('should stop test app', function (done) {
            supertest(swsTestFixture.SWS_SPECTEST_DEFAULT_URL).get('/stop')
                .expect(200)
                .end(function (err, res) {
                    setTimeout(function(){
                        done();
                    },1000)
                });
        });

    });
    run();
});

