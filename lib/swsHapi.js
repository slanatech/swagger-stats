/* swagger-stats Hapi plugin */
const SwsProcessor = require('./swsProcessor');
const swsUtil = require('./swsUtil');
const debug = require('debug')('sws:hapi');


/* HAPI Plugin */
class SwsHapi {

    constructor() {
        this.name = 'swagger-stats';
        this.version = '0.97.5';
        this.effectiveOptions = {};
        this.processor = null;
        this.pathUI = '/ui';
        this.pathDist = '/dist';
        this.pathStats = '/stats';
        this.pathMetrics = '/metrics';
        this.pathLogout = '/logout';
    }

    // Registers Hapi Plugin
    async register(server, options) {
        this.processOptions(options);
        this.processor = new SwsProcessor();
        this.processor.init(this.effectiveOptions);
        let processor = this.processor;
        server.events.on('response', function(request){
            let nodeReq = request.raw.req;
            let nodeRes = request.raw.res;
            try {
                processor.processResponse(nodeRes);
            }catch(e){
                debug("processRequest:ERROR: " + e);
            }
        });
        await server.ext('onRequest', function (request, h) {
            let nodeReq = request.raw.req;
            let nodeRes = request.raw.res;
            nodeRes._swsReq = nodeReq;
            nodeReq.sws = {};
            try {
                processor.processRequest(nodeReq,nodeRes);
            }catch(e){
                debug("processRequest:ERROR: " + e);
            }
            return h.continue
        });
        // Return statistics
        server.route({
            method: 'GET',
            path: this.pathStats,
            handler: function (request, h) {
                return processor.getStats(request.query);
            }
        });
    }

    setPaths(){
        this.pathUI = this.effectiveOptions.uriPath+'/ui';
        this.pathDist = this.effectiveOptions.uriPath+'/dist';
        this.pathStats = this.effectiveOptions.uriPath+'/stats';
        this.pathMetrics = this.effectiveOptions.uriPath+'/metrics';
        this.pathLogout = this.effectiveOptions.uriPath+'/logout';
    }

    setDefaultOptions(options){
        this.effectiveOptions = options;
        this.setPaths();
    }

    // Override defaults if options are provided
    processOptions(options){
        if(!options) return;

        for(let op in swsUtil.supportedOptions){
            if(op in options){
                this.effectiveOptions[op] = options[op];
            }
        }

        // update standard path
        this.setPaths();

        /* no auth for now
        if( swsOptions.authentication ){
            setInterval(expireSessionIDs,500);
        }
        */
    }
}

let swsHapi = new SwsHapi();
module.exports = swsHapi;
