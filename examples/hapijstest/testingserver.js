const Hapi = require("@hapi/hapi");
const express = require('express');
const swStats = require("../../lib"); // require('swagger-stats');

const swaggerSpec = require("../spectest/petstore3.json");

const app = express();

app.use( swStats.getMiddleware({
  authentication: true,
  onAuthenticate: (req, username, password) => {
    console.log("EXPRESS GO");
      return true;
  }
}));


async function init() {
    server = Hapi.server({
        port: 3040,
        host: "localhost",
    });

    let swsOptions = {
        name: "swagger-stats-hapitest",
        version: "0.95.17",
        hostname: "hostname",
        ip: "127.0.0.1",
        uriPath: "/swagger-stats",
        timelineBucketDuration: 1000,
        swaggerSpec: swaggerSpec,
        durationBuckets: [10, 100, 1000],
        metricsPrefix: "hapitest_",
        elasticsearch: "http://127.0.0.1:9200",
        authentication: true,
        onAuthenticate: function (req, user, pass) {
            console.log("ONAUTHENTICATE");
            return true;
        },
        elasticsearchIndexPrefix: "swaggerstats-",
    };
    await server.register({
        plugin: swStats.getHapiPlugin,
        options: swsOptions,
    });
    server.start();
}

init();

// const server = app.listen(8081, function () {
//   var host = server.address().address
//   var port = server.address().port
  
//   console.log("Example app listening at http://%s:%s", host, port)
// })