'use strict';
var chai = require('chai');
chai.should();
var expect = chai.expect;

var fs = require('fs');
var supertest = require('supertest');
var cuid = require('cuid');
var swaggerParser = require('swagger-parser');
var path = require('path');
var cp = require('child_process');

var swaggerSpecifications = require('./apisgurulist.json');

var debug = require('debug')('swstest:swaggerspecs');

var swsTestFixture = require('./testfixture');
var swsTestUtils = require('./testutils');

var APICORETEST = path.join(__dirname, '200_apicore.js');
///home/slavas/WORK/code/swagger-stats/node_modules/mocha
var MOCHA = path.join(__dirname, '..', 'node_modules','.bin','_mocha');

var swaggerSpecsInfo = [];

function preProcessSwaggerSpecs(){

    for(var specName in swaggerSpecifications ) {
        var specInfo = swaggerSpecifications[specName];
        if( ('preferred' in specInfo) && ('versions' in specInfo) ){
            if( specInfo.preferred in specInfo.versions){
                var specVersion = specInfo.versions[specInfo.preferred];
                var specURL = null;
                if( 'swaggerUrl' in specVersion ){
                    specURL = specVersion.swaggerUrl;
                } else if( 'swaggerYamlUrl' in specVersion ){
                    specURL = specVersion.swaggerYamlUrl;
                }
                if(specURL) {
                    debug('Adding Spec: %s version %s url %s', specName, specInfo.preferred, specURL);
                    swaggerSpecsInfo.push( {name:specName, version: specInfo.preferred, url: specURL} );
                }
            }
        }
    }
}

preProcessSwaggerSpecs();

setImmediate(function () {

    describe('Swagger Specifications Test', function () {
        this.timeout(30000);

        swaggerSpecsInfo.forEach(function(swaggerSpec) {

            it('should execute core API test for ' + swaggerSpec.name + ' v. ' + swaggerSpec.version, function (done) {

                var options = {maxBuffer: 1024*1024, env:{SWS_SPECTEST_URL:swaggerSpec.url}};
                var cmd = MOCHA + '  --timeout 10000 --delay ' + APICORETEST;
                cp.exec(cmd, function(error, stdout, stderr){
                    if (error) {
                        debug('ERROR executing core API test for %s: %s', swaggerSpec.url, error);
                        fs.appendFileSync('testerrors.log', stdout);
                        return done(error);
                    }
                    debug('Success!');
                    done();
                });

            });

        });

    });

    run();
});




