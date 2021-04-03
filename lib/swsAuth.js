const swsSettings = require('./swssettings');
const debug = require('debug')('sws:auth');
const basicAuth = require("basic-auth");
const Cookies = require('cookies');
const { v1: uuidv1 } = require('uuid');

/* Authentication */
class SwsAuth {

    constructor() {
        this.sessionIDs = {};
        this.expireIntervalId = null;
    }

    storeSessionID(sid){
        let tsSec = Date.now() + swsSettings.sessionMaxAge*1000;
        this.sessionIDs[sid] = tsSec;
        //debug('Session ID updated: %s=%d', sid,tssec);
        if( !this.expireIntervalId ){
            this.expireIntervalId = setInterval(() => {this.expireSessionIDs();},500);
        }
    }

    removeSessionID(sid){
        delete this.sessionIDs[sid];
    }

    // If authentication is enabled, executed periodically and expires old session IDs
    expireSessionIDs(){
        let tssec = Date.now();
        let expired = [];
        for(let sid in this.sessionIDs){
            if(this.sessionIDs[sid] < (tssec + 500)){
                expired.push(sid);
            }
        }
        for(let i=0;i<expired.length;i++){
            delete this.sessionIDs[expired[i]];
            debug('Session ID expired: %s', expired[i]);
        }
    }

    async processAuth(req,res) {

        if( !swsSettings.authentication ){
            return true;
        }

        if( swsSettings.customAuth ){
            return swsSettings.customAuth(req);
        }

        let cookies = new Cookies( req, res );

        // Check session cookie
        let sessionIdCookie = cookies.get('sws-session-id');
        if( (sessionIdCookie !== undefined) && (sessionIdCookie !== null) ){

            if( sessionIdCookie in this.sessionIDs ){
                // renew it
                //sessionIDs[sessionIdCookie] = Date.now();
                this.storeSessionID(sessionIdCookie);
                cookies.set('sws-session-id',sessionIdCookie,{path:swsSettings.basePath+swsSettings.uriPath,maxAge:swsSettings.sessionMaxAge*1000});
                // Ok
                req['sws-auth'] = true;
                return true;
            }
        }

        let authInfo = basicAuth(req);

        let authenticated = false;
        let msg = 'Authentication required';

        if( (authInfo !== undefined) && (authInfo!==null) && ('name' in authInfo) && ('pass' in authInfo)){
            if(typeof swsSettings.onAuthenticate === 'function'){

                let onAuthResult = null;
                try{
                    onAuthResult = await swsSettings.onAuthenticate(req, authInfo.name, authInfo.pass);
                }catch (e){
                    msg = `Authentication error: ${e.message}`;
                    res.statusCode = 403;
                    res.end(msg);
                    return false;
                }
                if( onAuthResult ){
                    authenticated = true;
                    // Session is only for stats requests
                    if(req.url.startsWith(swsSettings.pathStats)){
                        // Generate session id
                        let sessid = uuidv1();
                        this.storeSessionID(sessid);
                        // Set session cookie with expiration in 15 min
                        cookies.set('sws-session-id',sessid,{path:swsSettings.basePath+swsSettings.uriPath,maxAge:swsSettings.sessionMaxAge*1000});
                    }
                    req['sws-auth'] = true;
                    return true;
                } else {
                    res.statusCode = 403;
                    res.end(msg);
                    return false;
                }
            }else{
                res.statusCode = 403;
                res.end(msg);
                return false;
            }
        }else{
            res.statusCode = 403;
            res.end(msg);
            return false;
        }
    }

    processLogout(req,res){
        let cookies = new Cookies( req, res );
        let sessionIdCookie = cookies.get('sws-session-id');
        if( (sessionIdCookie !== undefined) && (sessionIdCookie !== null) ){
            if( sessionIdCookie in this.sessionIDs ){
                this.removeSessionID(sessionIdCookie);
                cookies.set('sws-session-id'); // deletes cookie
            }
        }
        res.statusCode = 200;
        res.end('Logged out');
    }

}

let swsAuth = new SwsAuth();
module.exports = swsAuth;
