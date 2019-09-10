'use strict';
var chai = require('chai');
chai.should();
var expect = chai.expect;
var supertest = require('supertest');

var swsTestFixture = require('./testfixture');


setImmediate(function() {

    describe('Delay 1 second', function () {
        it('should delay for 1 second', function (done) {
            setTimeout(function(){
                done();
            },1000);
        });

    });
    run();
});

