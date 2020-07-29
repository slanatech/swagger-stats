'use strict';

const debug = require('debug')('sws:auth');

const basicAuth = require('basic-auth');
const Cookies = require('cookies');
const uuidv1 = require('uuid/v1');

const swsSettings = require('./swssettings');

class SwsAuth {
    constructor() {
        this.sessionIDs = {};
    }

    storeSessionID(sid) {
        var tssec = Date.now() + swsSettings.sessionMaxAge * 1000;
        this.sessionIDs[sid] = tssec;
        //debug('Session ID updated: %s=%d', sid,tssec);
    }

    removeSessionID(sid) {
        delete this.sessionIDs[sid];
    }

    // If authentication is enabled, executed periodically and expires old session IDs
    expireSessionIDs() {
        var tssec = Date.now();
        var expired = [];
        for (var sid in this.sessionIDs) {
            if (this.sessionIDs[sid] < tssec + 500) {
                expired.push(sid);
            }
        }
        for (var i = 0; i < expired.length; i++) {
            delete this.sessionIDs[expired[i]];
            debug('Session ID expired: %s', expired[i]);
        }
    }

    processAuth(req, res, useWWWAuth) {
        const self = this;
        return new Promise(function (resolve, reject) {
            if (!swsSettings.authentication) {
                return resolve(true);
            }

            if (swsSettings.customAuth) {
                return resolve(swsSettings.customAuth(req));
            }

            var cookies = new Cookies(req, res);

            // Check session cookie
            var sessionIdCookie = cookies.get('sws-session-id');
            if (sessionIdCookie !== undefined && sessionIdCookie !== null) {
                if (sessionIdCookie in self.sessionIDs) {
                    // renew it
                    self.storeSessionID(sessionIdCookie);
                    cookies.set('sws-session-id', sessionIdCookie, {
                        path: swsSettings.basePath + swsSettings.uriPath,
                        maxAge: swsSettings.sessionMaxAge * 1000,
                    });
                    // Ok
                    req['sws-auth'] = true;
                    return resolve(true);
                }
            }

            var authInfo = basicAuth(req);
            var authenticated = false;
            var msg = 'Authentication required';

            if (
                authInfo !== undefined &&
                authInfo !== null &&
                'name' in authInfo &&
                'pass' in authInfo
            ) {
                if (typeof swsSettings.onAuthenticate === 'function') {
                    Promise.resolve(
                        swsSettings.onAuthenticate(
                            req,
                            authInfo.name,
                            authInfo.pass
                        )
                    ).then(function (onAuthResult) {
                        if (onAuthResult) {
                            authenticated = true;
                            // Session is only for stats requests
                            if (req.url.startsWith(swsSettings.pathStats)) {
                                // Generate session id
                                var sessid = uuidv1();
                                self.storeSessionID(sessid);
                                // Set session cookie with expiration in 15 min
                                cookies.set('sws-session-id', sessid, {
                                    path:
                                        swsSettings.basePath +
                                        swsSettings.uriPath,
                                    maxAge: swsSettings.sessionMaxAge * 1000,
                                });
                            }
                            req['sws-auth'] = true;
                            return resolve(true);
                        } else {
                            msg = 'Invalid credentials';
                            res.statusCode = 403;
                            res.end(msg);
                            return resolve(false);
                        }
                    });
                } else {
                    res.statusCode = 403;
                    res.end(msg);
                    return resolve(false);
                }
            } else {
                res.statusCode = 403;
                res.end(msg);
                return resolve(false);
            }
        });
    }

    processLogout(req, res) {
        var cookies = new Cookies(req, res);

        // Check session cookie
        var sessionIdCookie = cookies.get('sws-session-id');
        if (sessionIdCookie !== undefined && sessionIdCookie !== null) {
            if (sessionIdCookie in this.sessionIDs) {
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
