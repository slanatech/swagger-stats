/**
 * OpenObserve Emitter. Store Request/Response records in OpenObserve
 */

"use strict";

const os = require("os");
const util = require("util");
const http = require("http");
const url = require("url");
const https = require("https");
let axios = null;
let axiosPromise = new Promise(async (resolve) => {
    axios = (await import("axios")).default;
    resolve(axios);
});

const debug = require("debug")("sws:openobserve");
const swsUtil = require("./swsUtil");
const moment = require("moment");

const ES_MAX_BUFF = 50;

// OpenObserve Emitter. Store Request/Response records in OpenObserve
function swsOpenObserveEmitter() {
    // Options
    this.options = null;

    this.indexBuffer = "";
    this.bufferCount = 0;
    this.lastFlush = 0;

    this.openobserveURL = null;
    this.openobserveURLBulk = null;
    this.openobserveProto = null;
    this.openobserveHostname = null;
    this.openobservePort = null;

    this.openobserveUsername = null;
    this.openobservePassword = null;

    this.indexPrefix = "api-";

    this.enabled = false;
}

// Initialize
swsOpenObserveEmitter.prototype.initialize = function (swsOptions) {
    debug("Initializing OpenObserve Emitter");
    if (typeof swsOptions === "undefined") return;
    if (!swsOptions) return;

    this.options = swsOptions;

    // Set or detect hostname
    if (!(swsUtil.supportedOptions.openobserve in swsOptions)) {
        debug("OpenObserve is disabled");
        return;
    }

    this.openobserveURL = swsOptions[swsUtil.supportedOptions.openobserve];

    if (!this.openobserveURL) {
        debug("OpenObserve url is invalid");
        return;
    }
    this.enabled = true;
    debug("OpenObserve URL: " + this.openobserveURL);

    this.openobserveURLBulk = this.openobserveURL + "/_bulk";

    if (swsUtil.supportedOptions.openobserveIndexPrefix in swsOptions) {
        this.indexPrefix =
            swsOptions[swsUtil.supportedOptions.openobserveIndexPrefix];
    }

    if (swsUtil.supportedOptions.openobserveUsername in swsOptions) {
        this.openobserveUsername =
            swsOptions[swsUtil.supportedOptions.openobserveUsername];
    }
    if (swsUtil.supportedOptions.openobservePassword in swsOptions) {
        this.openobservePassword =
            swsOptions[swsUtil.supportedOptions.openobservePassword];
    }
};

// Update timeline and stats per tick
swsOpenObserveEmitter.prototype.tick = function (ts, totalElapsedSec) {
    // Flush if buffer is not empty and not flushed in more than 1 second
    if (this.bufferCount > 0 && ts - this.lastFlush >= 1000) {
        this.flush();
    }
};

// Pre-process RRR
swsOpenObserveEmitter.prototype.preProcessRecord = function (rrr) {
    // handle custom attributes
    if ("attrs" in rrr) {
        var attrs = rrr.attrs;
        for (var attrname in attrs) {
            attrs[attrname] = swsUtil.swsStringValue(attrs[attrname]);
        }
    }

    if ("attrsint" in rrr) {
        var intattrs = rrr.attrsint;
        for (var intattrname in intattrs) {
            intattrs[intattrname] = swsUtil.swsNumValue(intattrs[intattrname]);
        }
    }
};

// Index Request Response Record
swsOpenObserveEmitter.prototype.processRecord = function (rrr) {
    if (!this.enabled) {
        return;
    }

    this.preProcessRecord(rrr);

    // Create metadata
    var indexName =
        this.indexPrefix + moment(rrr["@timestamp"]).utc().format("YYYY.MM.DD");

    let meta = { index: { _index: indexName, _id: rrr.id } };

    // Add to buffer
    this.indexBuffer += JSON.stringify(meta) + "\n";
    this.indexBuffer += JSON.stringify(rrr) + "\n";

    this.bufferCount++;

    if (this.bufferCount >= ES_MAX_BUFF) {
        this.flush();
    }
};

// Flush method
swsOpenObserveEmitter.prototype.flush = function () {
    var that = this;
    if (!this.enabled) {
        return;
    }

    this.lastFlush = Date.now();

    let options = {
        method: "post",
        url: this.openobserveURLBulk,
        headers: {
            "Content-Type": "application/x-ndjson",
        },
        data: this.indexBuffer,
    };
    options.auth = {
        username: this.openobserveUsername,
        password: this.openobservePassword,
    };
    axios(options)
        .then((response) => {
            if (response && "status" in response && response.status !== 200) {
                debug(
                    "Indexing Error: %d %s",
                    response.status,
                    response.message
                );
            }
        })
        .catch((error) => {
            debug(`Indexing Error: ${error.message}`);
            that.enabled = false;
        });

    this.indexBuffer = "";
    this.bufferCount = 0;
};

module.exports = swsOpenObserveEmitter;
