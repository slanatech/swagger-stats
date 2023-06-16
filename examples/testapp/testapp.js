var http = require('http');
var path = require('path');
var debug = require('debug')('sws:testapp');

// Server
var server = null;

// Express and middlewares
var express = require('express');
var expressBodyParser = require('body-parser');

const swaggerParser = require('swagger-parser');

var swStats = require('../../lib');    // require('swagger-stats');

// Mockup API implementation
var API = require('./api');

var app = module.exports = express();
app.use(expressBodyParser.json()); // for parsing application/json
app.use(expressBodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// all environments
app.set('port', process.env.PORT || 3040);

// Suppress cache on the GET API responses
app.disable('etag');

app.get('/', function(req,res) {
    res.redirect('/swagger-stats/');
});

app.get('/apidoc.json', function(req,res){
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

var tlBucket = 60000;
if( process.env.SWS_TEST_TIMEBUCKET ){
    tlBucket = parseInt(process.env.SWS_TEST_TIMEBUCKET);
}

const swaggerSpec = require('./petstore.json');

// Testing validation of 3rd-party API spec
const parser = new swaggerParser();

parser.validate(swaggerSpec,function(err, api) {
    if (!err) {
        debug('Success validating swagger file!');
        //swaggerSpec = api;

        // Enable swagger-stats middleware
        app.use(swStats.getMiddleware({
            name: 'swagger-stats-testapp',
            version: '0.99.7',
            timelineBucketDuration: tlBucket,
            uriPath: '/swagger-stats',
            swaggerSpec:swaggerSpec,
            elasticsearch: 'http://127.0.0.1:9200',
        }));

        // Implement custom API in application to return collected statistics
        app.get('/stats', function(req,res){
            res.setHeader('Content-Type', 'application/json');
            res.send(swStats.getCoreStats());
        });

        // Connect API Router - it should be the end of the chain
        app.use('/v2', API);

        // Setup server
        server = http.createServer(app);
        server.listen(app.get('port'));
        debug('Server started on port ' + app.get('port') + ' http://localhost:'+app.get('port'));

    }
});

module.exports.app = app;
