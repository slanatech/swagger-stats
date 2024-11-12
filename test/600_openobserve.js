"use strict";
var util = require("util");
var chai = require("chai");
chai.should();
var expect = chai.expect;
var supertest = require("supertest");
var request = require("request");
var cuid = require("cuid");

var Q = require("q");
var http = require("http");

// We will use it to store expected values
var swsReqResStats = require("../lib/swsReqResStats");
var swsUtil = require("../lib/swsUtil");

var debug = require("debug")("swstest:auth");

var swsTestFixture = require("./testfixture");
var swsTestUtils = require("./testutils");

var swaggerSpecUrl = "./examples/spectest/petstore.yaml"; // Default

var appSpecTest = null;
var apiSpecTest = null;

var openobserveURL = "https://openobserve.youcompany.local/api/default";
var openobserveUsername = "openobserve";
var openobservePassword = "openobserve_password";

var test_request_id = cuid();

setImmediate(function () {
    describe("OpenObserve test", function () {
        this.timeout(15000);

        describe("Initialize", function () {
            it("should initialize spectest  app", function (done) {
                supertest(swsTestFixture.SWS_SPECTEST_DEFAULT_URL)
                    .get(swsTestFixture.SWS_TEST_STATS_API)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            if (res && res.status === 403) {
                                apiSpecTest = supertest
                                    .agent(swsTestFixture.SWS_TEST_DEFAULT_URL)
                                    .auth("swagger-stats", "swagger-stats");
                                done();
                            } else {
                                process.env.SWS_SPECTEST_URL = swaggerSpecUrl;
                                process.env.SWS_OPENOBSERVE = openobserveURL;
                                process.env.SWS_OPENOBSERVE_INDEX_PREFIX =
                                    "swaggerstats-";
                                process.env.SWS_OPENOBSERVE_USERNAME =
                                    openobserveUsername;
                                process.env.SWS_OPENOBSERVE_PASSWORD =
                                    openobservePassword;
                                appSpecTest = require("../examples/spectest/spectest");
                                var dest =
                                    "http://localhost:" +
                                    appSpecTest.app.get("port");
                                apiSpecTest = supertest(dest);
                                setTimeout(done, 2000);
                            }
                        } else {
                            apiSpecTest = supertest(
                                swsTestFixture.SWS_SPECTEST_DEFAULT_URL
                            );
                            done();
                        }
                    });
            });

            it("should send test requests", function (done) {
                this.timeout(10000);

                for (var i = 0; i < 10; i++) {
                    apiSpecTest
                        .get("/v2/mockapi")
                        .set("x-ses-test-id", test_request_id)
                        .set("x-ses-test-seq", i)
                        .set(
                            "x-sws-res",
                            '{"code":"200","message":"TEST","delay":"50","payloadsize":"5"}'
                        )
                        .expect(200)
                        .end(function (err, res) {
                            if (err) return done(err);
                        });
                }
                setTimeout(done, 5100);
            });

            it("should find test request in OpenObserve", function (done) {
                var searchBody = {
                    from: 0,
                    size: 100,
                    query: {
                        term: {
                            "http.request.headers.x-ses-test-id":
                                test_request_id,
                        },
                    },
                };

                var searchURL = openobserveURL + "/_search"; //?q='+test_request_id;
                request.post(
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: "Basic " + openobserveToken,
                        },
                        url: searchURL,
                        body: searchBody,
                        json: true,
                    },
                    function (error, response, body) {
                        if (error) {
                            debug(
                                "Error searching for request:",
                                JSON.stringify(error)
                            );
                            done(error);
                        } else {
                            // console.log(response);
                            response.should.have.property("statusCode");
                            response.statusCode.should.be.equal(200);
                            body.should.have.property("hits");
                            body.hits.should.have.property("total");
                            //(body.hits.total.value).should.be.equal(10);
                            done();
                        }
                    }
                );
            });
        });
    });

    run();
});
