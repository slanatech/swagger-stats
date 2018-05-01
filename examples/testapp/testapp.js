'use strict';

var http = require('http');
var path = require('path');
var debug = require('debug')('sws:testapp');

// Server
var server = null;

// Express and middlewares
var express = require('express');
var expressBodyParser = require('body-parser');
var expressFavicon = require('serve-favicon');
var expressStatic = require('serve-static');

var swaggerJSDoc = require('swagger-jsdoc');
var swaggerParser = require('swagger-parser');

var swStats = require('../../lib');    // require('swagger-stats');

// Mockup API implementation
var API = require('./api');

var app = module.exports = express();
app.use(expressFavicon(path.join(__dirname, '../../ui/favicon.png')));
app.use('/ui',expressStatic(path.join(__dirname, '../../ui')));
app.use('/ui/dist',expressStatic(path.join(__dirname, '../../dist')));
app.use('/node_modules',expressStatic(path.join(__dirname, '../../node_modules')));
app.use('/node_modules',expressStatic(path.join(__dirname, '../../node_modules')));
app.use(expressBodyParser.json()); // for parsing application/json
app.use(expressBodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// all environments
app.set('port', process.env.PORT || 3030);

// Suppress cache on the GET API responses
app.disable('etag');

app.get('/', function(req,res) {
    res.redirect('/ui');
});

app.get('/apidoc.json', function(req,res){
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

var tlBucket = 60000;
if( process.env.SWS_TEST_TIMEBUCKET ){
    tlBucket = parseInt(process.env.SWS_TEST_TIMEBUCKET);
}

// SWAGGER-JSDOC Initialization //
var apifile = path.join(__dirname,'api.js');
debug('initializing swagger spec from api file %s',apifile);
var swOptions = {
    swaggerDefinition: {
        "info": {
            "description": "This is a Petstore API implementation for swagger-stats sample app",
            "version": "1.0.0",
            "title": "Swagger-Stats Petstore ",
            "contact": {
                "email": "sv2@slanatech.com"
            },
            "license": {
                "name": "MIT"
            }
        },
        "host": "localhost",
        "basePath": "/api/v1",
        "tags": [
            {
                "name": "pet",
                "description": "Everything about your Pets",
                "externalDocs": {
                    "description": "Find out more",
                    "url": "http://swaggerstats.io"
                }
            },
            {
                "name": "store",
                "description": "Access to Petstore orders"
            },
            {
                "name": "user",
                "description": "Operations about user",
                "externalDocs": {
                    "description": "Find out more about our store",
                    "url": "http://swaggerstats.io"
                }
            }
        ],
        "schemes": ["http"]
    },
    apis: [apifile]  // Path to the API files with swagger docs in comments
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
var swaggerSpec = swaggerJSDoc(swOptions);

// Testing validation of 3rd-party API spec
var parser = new swaggerParser();

parser.validate(swaggerSpec,function(err, api) {
    if (!err) {
        debug('Success validating swagger file!');
        swaggerSpec = api;

        // Enable swagger-stats middleware
        app.use(swStats.getMiddleware({
            name: 'swagger-stats-testapp',
            version: '0.95.5',
            timelineBucketDuration: tlBucket,
            uriPath: '/swagger-stats',
            swaggerSpec:swaggerSpec,
            onResponseFinish: function(req,res,rrr){
                debug('onResponseFinish: %s', JSON.stringify(rrr));
            }
        }));

        // Implement custom API in application to return collected statistics
        app.get('/stats', function(req,res){
            res.setHeader('Content-Type', 'application/json');
            res.send(swStats.getCoreStats());
        });

        // Connect API Router - it should be the end of the chain
        app.use('/api/v1', API);

        // Setup server
        server = http.createServer(app);
        server.listen(app.get('port'));
        debug('Server started on port ' + app.get('port') + ' http://localhost:'+app.get('port'));

    }
});

module.exports.app = app;
