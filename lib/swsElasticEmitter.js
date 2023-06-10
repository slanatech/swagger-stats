/**
 * ElasticSearch Emitter. Store Request/Response records in Elasticsearch
 */

'use strict';

const os = require('os');
const util = require('util');
const http = require('http');
const url = require('url');
const https = require('https');
//const axios = require('axios');
let axios = null;
let axiosPromise = new Promise(async (resolve) => {
    axios = (await import('axios')).default;
    resolve(axios);
});
/*
(async () => {
    axios = (await import('axios')).default;
})();
*/

const debug = require('debug')('sws:elastic');
const swsUtil = require('./swsUtil');
const moment = require('moment');

const indexTemplate = require('../schema/elasticsearch/api_index_template.json');
const indexTemplate7X = require('../schema/elasticsearch/api_index_template_7x.json');


const ES_MAX_BUFF = 50;

// ElasticSearch Emitter. Store Request/Response records in Elasticsearch
function swsElasticEmitter() {

    // Options
    this.options = null;

    this.es7 = false;
    this.es8 = true;

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

    if(this.elasticsearchKey && this.elasticsearchCert){
        axios.defaults.httpsAgent = new https.Agent({
            rejectUnauthorized: false, // (NOTE: this will disable client verification)
            cert: this.elasticsearchCert,
            key: this.elasticsearchKey,
        });
    }

    // Check / Initialize schema
    Promise.resolve(axiosPromise).then( () => {
        this.initTemplate();
    });
};

// initialize index template
swsElasticEmitter.prototype.initTemplate = function(rrr) {

    var that = this;

    var requiredTemplateVersion = indexTemplate7X.version;

    // Check if there is a template
    var templateURL = this.elasticURL+'/_template/template_api';
    var getOptionsVersion = {method:'get',url:this.elasticURL};
    var getOptions = {method:'get',url:templateURL};
    let putOptions = {method:'put',url:templateURL, data:indexTemplate7X};

    if (this.elasticUsername && this.elasticPassword) {
        var auth = {
            username: this.elasticUsername,
            password: this.elasticPassword,
        }
        getOptionsVersion.auth = auth;
        getOptions.auth = auth;
        putOptions.auth = auth;
    }

    axios(getOptionsVersion).then( (response) => {
        const body = response.data || {};
        if(body && ('version' in body) && ('number' in body.version)){
            that.es7 = body.version.number.startsWith('7');
            that.es8 = body.version.number.startsWith('8');
        }

        if( !that.es7  && !that.es8){
            putOptions.json = indexTemplate;
        }

        let initializeNeeded = false;

        axios(getOptions).then( (response) => {
            const body = response.data || {};
            if( 'template_api' in body ) {
                if (!('version' in body.template_api) || (body.template_api.version < requiredTemplateVersion)) {
                    initializeNeeded = true;
                }
            }
        }).catch((error)=>{
            if(error.response && error.response.status === 404) {
                initializeNeeded = true;
            } else {
                debug(`Error querying template: ${error.message}`);
                that.enabled = false;
            }
        }).finally(()=> {
            if(initializeNeeded){
                axios(putOptions).then((response) =>{
                    debug("Elasticsearch template updated");
                    that.enabled = true;
                }).catch((error)=>{
                    debug(`Failed to update template: ${error.message}`);
                    that.enabled = false;
                });
            }else{
                that.enabled = true;
            }
        });


    }).catch((error)=>{
        debug(`Error getting version: ${error.message}`);
        that.enabled = false;
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
    if(!this.es7 && !this.es8){
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

    let options = {
        method: 'post',
        url: this.elasticURLBulk,
        headers: {
            'Content-Type': 'application/x-ndjson'
        },
        data: this.indexBuffer,
    };

    if (this.elasticUsername && this.elasticPassword) {
        options.auth = {
            username: this.elasticUsername,
            password: this.elasticPassword,
        }
    }

    axios(options).then((response)=> {
        if (response && ('status' in response) && (response.status !== 200)) {
            debug('Indexing Error: %d %s',response.status, response.message);
        }
    }).catch((error)=>{
        debug(`Indexing Error: ${error.message}`);
        that.enabled = false;
    });

    this.indexBuffer = '';
    this.bufferCount = 0;

};

module.exports = swsElasticEmitter;

