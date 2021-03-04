/**
 * ElasticSearch Emitter. Store Request/Response records in Elasticsearch
 */

'use strict';

var os = require('os');
var util = require('util');
var http = require('http');
var url = require('url');
var request = require('request');

var debug = require('debug')('sws:elastic');
var swsUtil = require('./swsUtil');
var moment = require('moment');

var indexTemplate = require('../schema/elasticsearch/api_index_template.json');
let indexTemplate7X = require('../schema/elasticsearch/api_index_template_7x.json');


const ES_MAX_BUFF = 50;

// ElasticSearch Emitter. Store Request/Response records in Elasticsearch
function swsElasticEmitter() {

    // Options
    this.options = null;

    this.es7 = true;

    this.indexBuffer = '';
    this.bufferCount = 0;
    this.lastFlush = 0;

    this.elasticURL = null;
    this.elasticURLBulk = null;
    this.elasticProto = null;
    this.elasticHostname = null;
    this.elasticPort = null;

    this.elasticUsername = null;
    this.elasticPassword = null;

    this.elasticsearchCert = null;
    this.elasticsearchKey = null

    this.indexPrefix = "api-";

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

    this.elasticURL = swsOptions[swsUtil.supportedOptions.elasticsearch];

    if (!this.elasticURL) {
        debug('Elasticsearch url is invalid');
        return;
    }

    this.elasticURLBulk = this.elasticURL +'/_bulk';

    if(swsUtil.supportedOptions.elasticsearchIndexPrefix in swsOptions) {
        this.indexPrefix = swsOptions[swsUtil.supportedOptions.elasticsearchIndexPrefix];
    }

    if(swsUtil.supportedOptions.elasticsearchUsername in swsOptions) {
        this.elasticUsername = swsOptions[swsUtil.supportedOptions.elasticsearchUsername];
    }

    if(swsUtil.supportedOptions.elasticsearchPassword in swsOptions) {
        this.elasticPassword = swsOptions[swsUtil.supportedOptions.elasticsearchPassword];
    }

    if(swsUtil.supportedOptions.elasticsearchCert in swsOptions) {
        this.elasticsearchCert = swsOptions[swsUtil.supportedOptions.elasticsearchCert]
    }

    if( swsUtil.supportedOptions.elasticsearchKey in swsOptions) {
        this.elasticsearchKey = swsOptions[swsUtil.supportedOptions.elasticsearchKey]
    }

    // Check / Initialize schema
    this.initTemplate();

    this.enabled = true;

};

// initialize index template
swsElasticEmitter.prototype.initTemplate = function(rrr) {

    var that = this;

    var requiredTemplateVersion = indexTemplate7X.version;

    // Check if there is a template
    var templateURL = this.elasticURL+'/_template/template_api';
    var getOptionsVersion = {url:this.elasticURL, json:true, key: this.elasticsearchKey,  cert: this.elasticsearchCert};
    var getOptions = {url:templateURL, json:true, key: this.elasticsearchKey, cert: this.elasticsearchCert};
    let putOptions = {url:templateURL, json:indexTemplate7X, key: this.elasticsearchKey, cert: this.elasticsearchCert};

    if (this.elasticUsername && this.elasticPassword) {
        var auth = {
            username: this.elasticUsername,
            password: this.elasticPassword,
        }
        getOptionsVersion.auth = auth;
        getOptions.auth = auth;
        putOptions.auth = auth;
    }

    request.get(getOptionsVersion, function (error, response, body) {
        if (error) {
            debug("Error getting version:", JSON.stringify(error));
            that.enabled.false;
        } else {
            if(body && ('version' in body) && ('number' in body.version)){
                that.es7 = body.version.number.startsWith('7');
            }

            if( !that.es7 ){
                putOptions.json = indexTemplate;
            }

            request.get(getOptions, function (error, response, body) {
                if(error) {
                    debug("Error querying template:", JSON.stringify(error) );
                }else {

                    var initializeNeeded = false;

                    if(response.statusCode === 404){
                        initializeNeeded = true;
                    }else if(response.statusCode === 200){
                        if( 'template_api' in body ) {
                            if (!('version' in body.template_api) || (body.template_api.version < requiredTemplateVersion)) {
                                initializeNeeded = true;
                            }
                        }
                    }

                    if(initializeNeeded){
                        request.put(putOptions, function (error, response, body) {
                            if(error) {
                                debug("Failed to update template:", JSON.stringify(error));
                            }
                        });
                    }

                }
            });

        }
    });
};

// Update timeline and stats per tick
swsElasticEmitter.prototype.tick = function (ts,totalElapsedSec) {

    // Flush if buffer is not empty and not flushed in more than 1 second
    if( (this.bufferCount > 0) && ((ts-this.lastFlush) >= 1000) ){
        this.flush();
    }

};


// Pre-process RRR
swsElasticEmitter.prototype.preProcessRecord = function(rrr){


    // handle custom attributes
    if('attrs' in rrr){
        var attrs = rrr.attrs;
        for(var attrname in attrs){
            attrs[attrname] = swsUtil.swsStringValue(attrs[attrname]);
        }
    }

    if('attrsint' in rrr){
        var intattrs = rrr.attrsint;
        for(var intattrname in intattrs){
            intattrs[intattrname] = swsUtil.swsNumValue(intattrs[intattrname]);
        }
    }

};


// Index Request Response Record
swsElasticEmitter.prototype.processRecord = function(rrr){

    if(!this.enabled){
        return;
    }

    this.preProcessRecord(rrr);

    // Create metadata
    var indexName = this.indexPrefix+moment(rrr['@timestamp']).utc().format('YYYY.MM.DD');

    let meta = {index:{_index:indexName,_id:rrr.id}};
    if(!this.es7){
        meta = {index:{_index:indexName,_type:'api',_id:rrr.id}};
    }

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

    this.lastFlush = Date.now();

    var options = {
        url: this.elasticURLBulk,
        headers: {
            'Content-Type': 'application/x-ndjson'
        },
        body: this.indexBuffer, 
        key: this.elasticsearchKey, 
        cert: this.elasticsearchCert
    };

    if (this.elasticUsername && this.elasticPassword) {
        options.auth = {
            username: this.elasticUsername,
            password: this.elasticPassword,
        }
    }

    request.post(options, function (error, response, body) {
        if (error) {
            debug("Indexing Error:", JSON.stringify(error) );
        }
        if (response && ('statusCode' in response) && (response.statusCode !== 200)) {
            debug('Indexing Error: %d %s',response.statusCode, response.message);
        }
    });

    this.indexBuffer = '';
    this.bufferCount = 0;

};

module.exports = swsElasticEmitter;

