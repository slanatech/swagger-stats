'use strict';

var http = require('http');
var path = require('path');
var log4js = require('log4js');

log4js.configure({
    "appenders": [
        {
            "type": "console"
        },
        {
            "type": "dateFile",
            "filename": "./examplelog",
            "pattern": "-yyyyMMdd-hh.log",
            "alwaysIncludePattern": true
        }
    ],
    "levels": {
        "swagger-stats-example": "DEBUG",
        "swagger-stats": "DEBUG"
    }
});
var logger = log4js.getLogger('swagger-stats-example');

// Express and middlewares
var express = require('express');
var expressBodyParser = require('body-parser');
var expressFavicon = require('serve-favicon');
var expressStatic = require('serve-static');

var swaggerJSDoc = require('swagger-jsdoc');
var swaggerParser = require('swagger-parser');

var swStats = require('../../lib');    // require('swagger-stats');

// Mockup API implementation
var API = require('./api')

var app = module.exports = express();
app.use(expressFavicon(path.join(__dirname, '../../ui/favicon.png')));
app.use('/ui',expressStatic(path.join(__dirname, '../../ui')));
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


// SWAGGER-JSDOC Initialization //
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
    apis: ['./api.js']  // Path to the API files with swagger docs in comments
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
var swaggerSpec = swaggerJSDoc(swOptions);

// Testing validation of 3rd-party API spec
var parser = new swaggerParser();

// TODO Create separate example app for validating 3rd-party swagger specs
//parser.validate("./swagger.yaml",function(err, api) {
parser.validate(swaggerSpec,function(err, api) {
    if (err) {
        console.log('Error validating swagger file: ' + err);
        return;
    }else {
        console.log('Success validating swagger file!');
        swaggerSpec = api;

        // Track statistics on API request / responses
        swStats.init({swaggerSpec:swaggerSpec});
        app.use(swStats.getMiddleware());

        // Implement custom API in application to return collected statistics
        app.get('/stats', function(req,res){
            res.setHeader('Content-Type', 'application/json');
            res.send(swStats.getCoreStats());
        });

        // Connect API Router - it should be the end of the chain
        app.use('/api/v1', API);

        // Setup server
        var server = http.createServer(app);
        server.listen(app.get('port'));
        logger.info('Server started on port ' + app.get('port') + ' http://localhost:'+app.get('port'));

    }
});




process.on('SIGTERM', function(){
    logger.info('Service shutting down gracefully');
    process.exit();
});

if (process.platform === 'win32') {
    require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    }).on('SIGINT', function () {
        process.emit('SIGINT');
    });
}

process.on('SIGINT', function () {
    process.exit();
});

