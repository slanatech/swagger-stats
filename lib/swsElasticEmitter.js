/**
 * ElasticSearch Emitter. Store Request/Response records in Elasticsearch
 */

'use strict';

var os = require('os');
var util = require('util');
var http = require('http');
var url = require('url');

var debug = require('debug')('sws:elastic');
var swsUtil = require('./swsUtil');
var moment = require('moment');

const ES_MAX_BUFF = 50;

// ElasticSearch Emitter. Store Request/Response records in Elasticsearch
function swsElasticEmitter() {

    // Options
    this.options = null;

    this.indexBuffer = '';
    this.bufferCount = 0;

    this.elasticProto = null;
    this.elasticHostname = null;
    this.elasticPort = null;

    this.enabled = false;
}

// Initialize
swsElasticEmitter.prototype.initialize = function (swsOptions) {

    if(typeof swsOptions === 'undefined') return;
    if(!swsOptions) return;

    this.options = swsOptions;

    // Set or detect hostname
    if(!(swsUtil.supportedOptions.elasticsearch in swsOptions)) {
        debug('Elasticsearch is disabled');
        return;
    }

    var elasticsearchURL = swsOptions[swsUtil.supportedOptions.elasticsearch];

    var urlObj = null;
    try {
        urlObj = url.parse(elasticsearchURL);
    }catch(e){
        debug('Invalid Elasticsearch URL %s',elasticsearchURL);
        return;
    }

    this.elasticProto = ('protocol' in urlObj ? urlObj.protocol : null);
    this.elasticHostname = ('hostname' in urlObj ? urlObj.hostname : null);
    this.elasticPort = ('port' in urlObj ? urlObj.port : null);

    if(!this.elasticProto || !this.elasticHostname || !this.elasticPort ){
        debug('Invalid Elasticsearch URL %s',elasticsearchURL);
        return;
    }

    this.enabled = true;

};

// Index Request Response Record
swsElasticEmitter.prototype.processRecord = function(rrr){

    if(!this.enabled){
        return;
    }

    // Create metadata
    var indexName = 'api-'+moment(rrr['@timestamp']).format('YYYY.MM.DD');
    var meta = {index:{_index:indexName,_type:'api',_id:rrr.id}};

    // Add to buffer
    this.indexBuffer += JSON.stringify(meta) + '\n';
    this.indexBuffer += JSON.stringify(rrr) + '\n';

    this.bufferCount++;

    if( this.bufferCount >= ES_MAX_BUFF ) {
        this.flush();
    }
};

swsElasticEmitter.prototype.flush = function(){

    if(!this.enabled){
        return;
    }

    // Submit and don't wait
    const options = {
        protocol: this.elasticProto,
        hostname: this.elasticHostname,
        port: this.elasticPort,
        path: '/_bulk',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Content-Length': Buffer.byteLength(this.indexBuffer)
        }
    };
    const req = http.request(options, function (res) {
        if (('statusCode' in res) && (res.statusCode !== 200)) {
            // TODO Error details
            debug('Elasticsearch: Indexing Error');
        }
    });

    req.on('error', function(e) {
        debug("Elasticsearch: Indexing Error:", e.message );
    });

    req.write(this.indexBuffer);
    req.end();

    this.indexBuffer = '';
    this.bufferCount = 0;
};

module.exports = swsElasticEmitter;

