/*
 * swagger-stats main UI plugin
 */

;(function ($, window, document, undefined) {

	/*global jQuery, console*/

	'use strict';

	var pluginName = 'swaggerstatsui';

    var pluginTemplates = {
        nav: '<nav class="navbar navbar-default navbar-fixed-top"> \
                 <div class="container-fluid"> \
                    <div class="navbar-header"> \
                        <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar"> \
                            <span class="sr-only">Toggle navigation</span> \
                            <span class="icon-bar"></span> \
                            <span class="icon-bar"></span> \
                            <span class="icon-bar"></span> \
                        </button> \
                        <a class="navbar-brand" href="http://swaggerstats.io" target="_blank" data-toggle="tooltip" title="swaggerstats.io">\
                            <span class="sws-logo">{<i class="fa fa-signal"></i>}<span class="sws-logo-title">swagger-stats</span></span>\
                        </a> \
                    </div> \
                    <div id="navbar" class="navbar-collapse collapse" aria-expanded="false" style="height: 0.555556px;"> \
                        <ul id="sws-toolbar" class="nav navbar-nav"> \
                        </ul> \
                        <div class="sws-nav-ctrls pull-right">\
                        </div>\
                    </div> \
                 </div> \
               </nav>',
        content: '<div id="sws-content" class="container-fluid page-content"></div>',
        footer:'<footer class="sws-footer bd-footer text-muted"> \
                    <div class="container-fluid"> \
                        <p>Data since <span class="label label-medium sws-uptime"></span> starting from <span class="label label-medium sws-time-from"></span> updated at <span class="label label-medium sws-time-now"></span></p> \
                        <p><strong>swagger-stats v.0.80.3</strong></p> \
                        <p>Copyright&copy; 2017 <a href="#">slana.tech</a></p> \
                    </div> \
                </footer>'
    };

	var _default = {};

	_default.settings = {
		testOption: true
	};

	var SWSUI = function (element, options) {

		this.$element = $(element);
		this.elementId = element.id;

        // Active Page Id
        this.activePageId = null;
        // Active Page Context ( #pageid=context)
        this.activePageContext = null;

        // Auto-refresh interval, 60 seconds by default
        this.refreshInterval = 60;
        this.refreshIntervalId = null;


        // TODO Stats

        // Last retrieved statistics values
		this.apistats = {};


        // TODO Remove
        this.lasterrors = null;
        this.longestreq = null;

        // Pre-processed stats data
        // Sorted timeline array
        this.timeline_array = [];

		this.init(options);

		$.swsui = this;

		return {
			options: this.options,
			init: $.proxy(this.init, this),
			remove: $.proxy(this.remove, this)
		};
	};


    SWSUI.prototype.init = function (options) {
		this.options = $.extend({}, _default.settings, options);

        // Constants

        this.shortDateTimeFormat = 'MM/DD/YY hh:mm:ss';

        this.palette = ['#1f77b4',
            '#aec7e8',
            '#ff7f0e',
            '#ffbb78',
            '#2ca02c',
            '#98df8a',
            '#d62728',
            '#ff9896',
            '#9467bd',
            '#c5b0d5',
            '#8c564b',
            '#c49c94',
            '#e377c2',
            '#f7b6d2',
            '#7f7f7f',
            '#c7c7c7',
            '#bcbd22',
            '#dbdb8d',
            '#17becf',
            '#9edae5'];

        this.httpStatusCodes = {
            200: 'OK',
            201: 'Created',
            202: 'Accepted',
            203: 'Non-Authoritative Information',
            204: 'No Content',
            205: 'Reset Content',
            206: 'Partial Content',
            207: 'Multi Status',
            208: 'Already Reported',
            226: 'IM Used',
            300: 'Multiple Choices',
            301: 'Moved Permanently',
            302: 'Found',
            303: 'See Other',
            304: 'Not Modified',
            305: 'Use Proxy',
            306: 'Switch Proxy',
            307: 'Temporary Redirect',
            308: 'Permanent Redirect',
            400: 'Bad Request',
            401: 'Unauthorized',
            402: 'Payment Required',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            406: 'Not Acceptable',
            407: 'Proxy Authentication Required',
            408: 'Request Time-out',
            409: 'Conflict',
            410: 'Gone',
            411: 'Length Required',
            412: 'Precondition Failed',
            413: 'Request Entity Too Large',
            414: 'Request-URI Too Large',
            415: 'Unsupported Media Type',
            416: 'Requested Range not Satisfiable',
            417: 'Expectation Failed',
            418: 'I\'m a teapot',
            421: 'Misdirected Request',
            422: 'Unprocessable Entity',
            423: 'Locked',
            424: 'Failed Dependency',
            426: 'Upgrade Required',
            428: 'Precondition Required',
            429: 'Too Many Requests',
            431: 'Request Header Fields Too Large',
            451: 'Unavailable For Legal Reasons',
            500: 'Internal Server Error',
            501: 'Not Implemented',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Time-out',
            505: 'HTTP Version not Supported',
            506: 'Variant Also Negotiates',
            507: 'Insufficient Storage',
            508: 'Loop Detected',
            510: 'Not Extended',
            511: 'Network Authentication Required'
        };



        // Define SWS UI Dashboard Layout
        this.layout = new SWSLayout();

        // Consider if need to pass options to layout initialization
        this.layout.init({});

        // Active Page Id
        this.activePageId = null;
        this.activePageContext = null;

        this.destroy();
        this.render();

        var that = this;
        that.enableNavigation();
        that.startRefresh();
	};

    SWSUI.prototype.render = function () {
        this.$element.empty();

        // Main layout
        var elemNav = $(pluginTemplates.nav);
        this.$element.append(elemNav);
        var elemContent = $(pluginTemplates.content);
        this.$element.append(elemContent);
        var elemFooter = $(pluginTemplates.footer);
        this.$element.append(elemFooter);
        this.buildNavControls();

        // Build dashboard //

        // Pages
        for( var pageId in this.layout.pages){
            var page = this.layout.pages[pageId];

            // Add toolbar entry for the page
            page.id = pageId;
            var navHtml = '<li id='+page.id +' class="sws-tool-li"><a href="#'+pageId+'"' +
                          'data-toggle="tooltip" title="'+page.title+'"><i class="sws-tool-i fa '+page.icon+'"></i>' +
                          '<span class="sws-tool-title">'+page.title+'</span></a></li>';
            var pageNav = $(navHtml);
            $('#sws-toolbar').append(pageNav);
            // Add Content entry for the page
            //var elemPageContent = $('<div id="'+pageId+'_content" style="display: none"></div>');
            var elemPageContent = $('<div id="'+pageId+'_content"></div>');
            elemContent.append(elemPageContent);

            // Page Header - Title
            //var elemHdr = $('<div class="page-header"><h1>'+page.title+'</h1></div>');
            //elemPageContent.append(elemHdr);

            // Page rows
            for( var rowId in page.rows){
                var row = page.rows[rowId];
                row.id = pageId+'_'+rowId;
                var rowextraclass = ('class' in row ? row.class : '');
                var elemRow = $('<div id="'+row.id+'" class="row '+ rowextraclass +'">');
                elemPageContent.append(elemRow);

                // Row Columns
                for( var colId in row.columns ){
                    var col = row.columns[colId];
                    col.id = colId;
                    var elemCol = $('<div id="'+col.id+'" class="'+col.class+'"></div>');
                    elemRow.append(elemCol);
                    this.renderCol(page, row, col, elemCol);
                }
            }
        }

        this.subscribeEvents();
    };

    SWSUI.prototype.buildNavControls = function () {

        var elemNavCtrls = $('.sws-nav-ctrls');

        var elemRefresh = $('<div class="sws-refresh-group"></div>');
        elemRefresh.append($('<span class="sws-refresh sws-refreshing fa fa-refresh" interval="0"></span>'));
        elemRefresh.append($('<span class="sws-refresh sws-pauseresume fa fa-pause" interval="-1"></span>'));
        elemRefresh.append($('<span class="sws-refresh label label-transparent" interval="1">1s</span>'));
        elemRefresh.append($('<span class="sws-refresh label label-transparent" interval="10">10s</span>'));
        elemRefresh.append($('<span class="sws-refresh label label-transparent" interval="30">30s</span>'));
        elemRefresh.append($('<span class="sws-refresh label label-primary" interval="60">1m</span>'));
        elemNavCtrls.append(elemRefresh);

        var time = moment(Date.now()).format();
        var elemTime =$('<div class="sws-time-group"></div>');
        elemTime.append($('<span class="fa fa-at"></span>'));
        elemTime.append($('<span class="sws-time-now"></span>'));
        elemNavCtrls.append(elemTime);
    };

    // Create column element based on definition
    SWSUI.prototype.renderCol = function( page, row, col, elemCol ) {
        if(!('type' in col)) return;
        switch(col.type){
            case 'empty':
                break;
            case 'title':
                elemCol.append($('<h1>'+page.title+'</h1>'));
                break;
            case 'widget':
                elemCol.swswidget(col);
                break;
            case 'chart':
                elemCol.swschart( col.options,{ chartdata: col.chartdata, chartoptions: col.chartoptions } );
                break;
            case 'datatable':
                var tid = elemCol.attr('id')+'_tbl';
                col.options.id = tid;
                col.options.swsId = this.elementId;
                var args = { dataTableSettings: col.dataTableSettings };
                if( 'showDetails' in col ){
                    args.showDetails = col.showDetails;
                }
                elemCol.swstable( col.options, args );
                break;
            case 'cubism':
                elemCol.swscubism( col.options );
                break;
            case 'apiopsel':
                elemCol.swsapiopsel( col.options );
                break;
        }
    };

    SWSUI.prototype.enableNavigation = function () {

        var that = this;

        $(window).on('hashchange', function(e) {
            console.log('Navigating to:' + window.location.hash );
            that.setActive(window.location.hash);
        });

        // Determine startup location
        var hashLoc = window.location.hash;
        console.log('Startup location: ' + hashLoc );
        if( hashLoc !== ''){
            console.log('Starting at: ' + hashLoc );
            this.setActive(hashLoc);
        }else{
            var startLocHash = '#'+this.layout.startpage;
            console.log('Starting at '+ startLocHash);
            window.location.hash = startLocHash;
            this.setActive(startLocHash);
        }

    };


    // Set specified tool menu to active state
    SWSUI.prototype.setActive = function(pageIdHash){

        var that = this;

        // Support location as #pageid=context
        var hasharray = pageIdHash.split('=',2);
        if( hasharray.length > 1){
            this.activePageId = hasharray[0].replace('#','');
            this.activePageContext = hasharray[1];
        }else{
            this.activePageId = pageIdHash.replace('#','');
            this.activePageContext = null;
        }

        console.log('setActive:' + this.activePageId + ' ctx:'+ this.activePageContext);

        // Fallback to default
        if( !(this.activePageId in this.layout.pages) ){
            this.activePageId = this.layout.startpage;
        }

        // Highlight active tool in toolbar and show content
        $('.sws-tool-li').each(function(index){
            if( this.id === that.activePageId){
                $(this).addClass('active');
                $('#'+this.id+'_content').show();
            }else{
                $(this).removeClass('active');
                $('#'+this.id+'_content').hide();
            }
        });

        this.refreshStats();
    };


    SWSUI.prototype.remove = function () {
		this.destroy();
		$.removeData(this, pluginName);
	};

    SWSUI.prototype.destroy = function () {
        this.$element.empty();
		this.unsubscribeEvents();
	};

    SWSUI.prototype.startProgress = function () {
        $('.sws-refreshing').addClass('fa-spin');
    };

    SWSUI.prototype.stopProgress = function () {
        $('.sws-refreshing').removeClass('fa-spin');
    };

    SWSUI.prototype.startRefresh = function () {
        if( this.refreshIntervalId != null ){
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
        }
        this.refreshIntervalId = setInterval( $.proxy(this.refreshStats, this), this.refreshInterval*1000 );
    };

    SWSUI.prototype.pauseOrResumeRefresh = function () {
        if( this.refreshIntervalId != null ){
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
            return false;
        }
        this.refreshIntervalId = setInterval( $.proxy(this.refreshStats, this), this.refreshInterval*1000 );
        return true;
    };

    SWSUI.prototype.refreshStats = function () {
        console.log('Refreshing with ' + this.refreshInterval + ' sec interval');
        this.startProgress();
        var activeDef = this.layout.pages[this.activePageId];
        var getdataDef = activeDef.getdata;
        var getdataReq = { type: getdataDef.type, url: getdataDef.url, data:{} };
        getdataReq.data.fields = [];
        // Support fields to be retrieved always
        if(('data' in getdataDef) && ('fields' in getdataDef.data) && (getdataDef.data.fields instanceof Array)){
            for(var k=0;k<getdataDef.data.fields.length;k++){
                getdataReq.data.fields.push(getdataDef.data.fields[k]);
            }
        }
        // Support "once" fields - get such fields only once if not exist in data
        if('getfieldsonce' in activeDef){
            for(var i=0;i<activeDef.getfieldsonce.length;i++){
                if( !(activeDef.getfieldsonce[i] in this.apistats) ){
                    getdataReq.data.fields.push(activeDef.getfieldsonce[i]);
                }
            }
        }
        // Post-process getDataReq, if necessary
        if('getdataproc' in activeDef){
            activeDef.getdataproc(this.activePageId, this.activePageContext, getdataReq);
        }

        var that = this;
        $.ajax( getdataReq )
            .done(function( msg ) {

                // process received data as needed
                that.processStatsData( getdataDef, msg );

                that.$element.trigger(activeDef.datevent, that);
                that.stopProgress();
            })
            .fail(function( jqXHR, textStatus ){
                that[activeDef.datastore] = null;
                that.updateTimeControls();
                // TODO Clean pre-processed data ?
                that.$element.trigger(activeDef.datevent, that);
                that.stopProgress();
            });
    };


    SWSUI.prototype.updateTimeControls = function(datatype) {
        $('.sws-time-from').html(this.apistats.startts!==null ? moment(this.apistats.startts).format(this.shortDateTimeFormat) : '-');
        $('.sws-uptime').html(this.apistats.startts!==null ? moment(this.apistats.startts).fromNow() : '-');
        $('.sws-time-now').html(moment(Date.now()).format(this.shortDateTimeFormat));
    };

    // Process received stats data
    SWSUI.prototype.processStatsData = function(getdataDef, data) {

        // First, store received data in apistats, complimenting existing data
        for(var prop in data ){
            this.apistats[prop] = data[prop];
        }

        // Update time controls
        this.updateTimeControls();

        // Perform additional processing of received data as needed
        if( 'timeline' in data ){
            // Build sorted timeline
            this.timeline_array = [];
            if(this.apistats && this.apistats.timeline && this.apistats.timeline.data ) {
                for(var key in this.apistats.timeline.data){
                    var entry = this.apistats.timeline.data[key];
                    entry.tc = parseInt(key);
                    var ts = entry.tc*this.apistats.timeline.settings.bucket_duration;
                    entry.timelabel = moment(ts).format('hh:mm:ss');
                    this.timeline_array.push(entry);
                }
            }

            // Sort it by timecode ascending
            this.timeline_array.sort(function(a, b) {
                return a.tc - b.tc;
            });
        }

    };

    SWSUI.prototype.unsubscribeEvents = function () {
        this.$element.off('sws-ondata-summary');
        this.$element.off('sws-ondata-requests');
        this.$element.off('sws-ondata-errors');
        this.$element.off('sws-ondata-lasterrors');
        this.$element.off('sws-ondata-longestreq');
        this.$element.off('sws-ondata-rates');
        this.$element.off('sws-ondata-payload');
        this.$element.off('sws-ondata-api');
        this.$element.off('sws-ondata-apiop');
        this.$element.off('sws-onchange-apiop');
        $('.sws-refresh').off('click');
	};

    SWSUI.prototype.subscribeEvents = function () {
	    this.unsubscribeEvents();
        this.$element.on('sws-ondata-summary', $.proxy(this.onDataSummary, this));
        this.$element.on('sws-ondata-requests', $.proxy(this.onDataRequests, this));
        this.$element.on('sws-ondata-errors', $.proxy(this.onDataErrors, this));
        this.$element.on('sws-ondata-lasterrors', $.proxy(this.onDataLastErrors, this));
        this.$element.on('sws-ondata-longestreq', $.proxy(this.onDataLongestReq, this));
        this.$element.on('sws-ondata-rates', $.proxy(this.onDataRates, this));
        this.$element.on('sws-ondata-payload', $.proxy(this.onDataPayload, this));
        this.$element.on('sws-ondata-api', $.proxy(this.onDataAPI, this));
        this.$element.on('sws-ondata-apiop', $.proxy(this.onDataAPIOp, this));
        this.$element.on('sws-onchange-apiop', $.proxy(this.onChangeAPIOp, this));
        $('.sws-refresh').on('click', $.proxy(this.onRefreshClick, this));
	};

    SWSUI.prototype.onRefreshClick = function(Event){
        if(!Event.target) return;
        var interval = parseInt($(Event.target).attr('interval'));
        if(interval==0){
            // Refresh immediately
            this.refreshStats();
            return;
        }else if(interval==-1){
            // Pause or resume
            $(Event.target).removeClass('fa-pause').removeClass('fa-play');
            $(Event.target).addClass( this.pauseOrResumeRefresh() ? 'fa-pause':'fa-play');
            return;
        }
        console.log('Setting refresh interval:' + interval);
        this.refreshInterval = interval;
        this.startRefresh();
        // Set active
        $('.sws-refresh').each(function (index) {
            if( $(this).attr('interval') == interval){
                $(this).removeClass('label-transparent').addClass('label-primary');
            }else{
                $(this).removeClass('label-primary').addClass('label-transparent');
            }
        })
    };


    SWSUI.prototype.onDataSummary = function(){
        this.updateSummary();
    };

    SWSUI.prototype.onDataRequests = function(){
        this.updateRequests();
    };

    SWSUI.prototype.onDataErrors = function(){
        this.updateErrors();
    };

    SWSUI.prototype.onDataLastErrors = function(){
        this.updateLastErrors();
    };

    SWSUI.prototype.onDataLongestReq = function(){
        this.updateLongestReq();
    };

    SWSUI.prototype.onDataRates = function(){
        this.updateRates();
    };

    SWSUI.prototype.onDataPayload = function(){
        this.updatePayload();
    };

    SWSUI.prototype.onDataAPI = function(){
        this.updateAPI();
    };

    SWSUI.prototype.onDataAPIOp = function(){
        console.log('onDataAPIOp');
        this.updateAPIOp();
    };

    SWSUI.prototype.onChangeAPIOp = function(srcEvent){
        console.log('onChangeAPIOp');
        var selectedOp = {};
        $('#sws_apiop_opsel').swsapiopsel('getvalue', selectedOp);
        var locHash = '#sws_apiop='+selectedOp.method+','+selectedOp.path;
        window.location.hash = locHash;
    };

    // SERVICE //////////////////////////////////////////// //

    // Rate calcuated based on count of items per number of seconds elapsed since startts, and until endts or current time
    // Rate will change depending on moment of observation
    // I.e. if count does not keep growing with the same speed ( rate :) rate will be dropping over time
    SWSUI.prototype.getRate = function(count,startts,endts) {
        endts = typeof endts !== 'undefined' ? endts : Date.now();
        var elapsed = (endts - startts)/1000;
        return (count / elapsed).toFixed(2);
    };

    // Get prop value from latest (current) bucket in timeline
    SWSUI.prototype.getLatestTimelineValue = function(prop) {
        if(this.apistats==null) return 0;
        try {
            var last = this.apistats.timeline.data[this.apistats.timeline.settings.bucket_current];
            return (prop in last? last[prop] : 0);
        }catch(e){
            return 0;
        }
    };

    // [sv2] Calculate linear regression to show trend
    SWSUI.prototype.getTimelineTrend = function (prop){
        if(!this.timeline_array || this.timeline_array.length<=0) return '';
        if( !(prop in this.timeline_array[0])) return '';
        var n = this.timeline_array.length;
        var sum_x = 0;
        var sum_y = 0;
        var sum_xy = 0;
        var sum_xx = 0;
        var sum_yy = 0;
        for(var i=0;i<n;i++) {
            var x = (prop in this.timeline_array[i] ? this.timeline_array[i][prop] : 0);
            sum_x += x;
            sum_y += i;
            sum_xy += (x*i);
            sum_xx += (x*x);
            sum_yy += (i*i);
        }
        var slope = 0;
        var divby = (n*sum_xx - sum_x * sum_x);
        if( divby != 0 ) {
            slope = (n * sum_xy - sum_x * sum_y) / divby;
            //var intercept = (sum_y - lr.slope * sum_x)/n;
            //var r2 = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);
        }
        var res = (slope > 0 ? 'up' : (slope<0 ? 'down': '') );
        return res;
    };

    // pre-proces & format widget value for durations. Input value assumed in milleseconds
    SWSUI.prototype.formatWValDurationMS = function(data,fixed){
        if(!('value' in data)) return data;
        fixed = typeof fixed !== 'undefined' ? fixed : 0;
        var val = data.value;
        if(val <1000){
            data.value = val.toFixed(fixed);
            data.extra = 'msec';
        }else{
            data.value = (val/1000).toFixed(fixed);
            data.extra = 'sec';
        }
        return data;
    };

    // Generic method to populate time-series charts data from timeline_array
    // chartdata: Chart.js data set
    // datasets: [prop1,prop2,...propN] - Array of swsReqResStat properties corresponding to chart datasets
    SWSUI.prototype.buildTimeSeriesChartData = function(chartdata,datasets) {

        // Shift, until beginning match
        // first label corresponds to first timelabel in timeline_array
        var start_label = this.timeline_array[0].timelabel;
        while( (chartdata.labels.length>0)
        && (chartdata.labels[0] != start_label) ){
            chartdata.labels.shift();
            for(var ks=0;ks<datasets.length;ks++){
                chartdata.datasets[ks].data.shift();
            }
        }
        // Update
        var j = 0;
        for(j=0;j<chartdata.labels.length;j++) {
            for(var ku=0;ku<datasets.length;ku++){
                chartdata.datasets[ku].data[j] = this.timeline_array[j][datasets[ku]];
            }
        }
        // Add
        for(;j<this.timeline_array.length;j++) {
            chartdata.labels.push(this.timeline_array[j].timelabel);
            for(var ka=0;ka<datasets.length;ka++){
                chartdata.datasets[ka].data.push(this.timeline_array[j][datasets[ka]]);
            }
        }
    };

    SWSUI.prototype.updateByMethodChartData = function(chartdata,prop,adjust) {
        var vGetter = (typeof prop === 'function') ?  prop : null;
        adjust = (typeof adjust === 'function') ?  adjust : null;
        for (var method in this.apistats.method) {
            var reqStats = this.apistats.method[method];
            var idx = chartdata.labels.indexOf(method);
            var val = 0;
            if(vGetter){
                var vRaw = vGetter(reqStats);
                val = (adjust ? adjust(vRaw) : vRaw);
            }else{
                val = prop in reqStats ? (adjust ? adjust(reqStats[prop]) : reqStats[prop]) : 0;
            }
            if (idx != -1) {
                chartdata.datasets[0].data[idx] = val;
            } else {
                idx = chartdata.labels.length;
                chartdata.labels.push(method);
                chartdata.datasets[0].data.push(val);
                if (idx >= this.palette.length) idx = 0;
                chartdata.datasets[0].backgroundColor.push(this.palette[idx]);
            }
        }
    };

    // PAGES UPDATES ////////////////////////////////////// //


    // Update values on Summary page
    SWSUI.prototype.updateSummary = function() {

        // Update values, if we have data
        if(this.apistats==null) return;

        // Update Widgets
        $('#sws_summ_wRq').swswidget('setvalue', { value:this.apistats.all.requests, trend: this.getTimelineTrend('requests')} );
        $('#sws_summ_wRp').swswidget('setvalue', { value:(this.apistats.all.requests-this.apistats.all.responses) } );

        $('#sws_summ_wRRte').swswidget('setvalue', { value:this.getLatestTimelineValue('req_rate').toFixed(4), extra:'req/sec', trend: this.getTimelineTrend('req_rate')} );
        $('#sws_summ_wERte').swswidget('setvalue', { value:this.getLatestTimelineValue('err_rate').toFixed(4), extra:'err/sec', trend: this.getTimelineTrend('err_rate')} );

        $('#sws_summ_wMHt').swswidget('setvalue', this.formatWValDurationMS({value:this.apistats.all.max_time}) );
        $('#sws_summ_wAHt').swswidget('setvalue', this.formatWValDurationMS({value:this.apistats.all.avg_time}) );
        //$('#sws_summ_wRrCl').swswidget('setvalue', { value:this.apistats.all.avg_req_clength, extra:'bytes', trend:this.getTimelineTrend('avg_req_clength')} );

        $('#sws_summ_wRs').swswidget('setvalue', { value:this.apistats.all.responses, trend: this.getTimelineTrend('responses')} );
        $('#sws_summ_wErr').swswidget('setvalue', { value:this.apistats.all.errors, total: this.apistats.all.requests, trend: this.getTimelineTrend('errors')} );
        $('#sws_summ_wSs').swswidget('setvalue', { value:this.apistats.all.success, total:this.apistats.all.requests, trend: this.getTimelineTrend('success')});
        $('#sws_summ_wRed').swswidget('setvalue', { value:this.apistats.all.redirect,total:this.apistats.all.requests,trend: this.getTimelineTrend('redirect')});
        $('#sws_summ_wCe').swswidget('setvalue', { value:this.apistats.all.client_error,total:this.apistats.all.requests,trend:this.getTimelineTrend('client_error')});
        $('#sws_summ_wSe').swswidget('setvalue', { value:this.apistats.all.server_error,total:this.apistats.all.requests,trend:this.getTimelineTrend('server_error')});
        //$('#sws_summ_wReCl').swswidget('setvalue', { value:this.apistats.all.avg_res_clength, extra:'bytes', trend:this.getTimelineTrend('avg_res_clength')} );

        // Update timeline chart
        var elemTimelineChart = $('#sws_summ_cTl');
        this.buildTimeSeriesChartData(elemTimelineChart.swschart('getchartdata'),['success','redirect','client_error','server_error']);
        elemTimelineChart.swschart('update');
    };

    // Update values on Requests page
    SWSUI.prototype.updateRequests = function() {

        // Update values, if we have data
        if(this.apistats==null) return;

        // Table
        var elemRbyMTable = $('#sws_req_tRbM');
        elemRbyMTable.swstable('clear');
        for( var method in this.apistats.method){
            var reqStats = this.apistats.method[method];
            var row = [ method, reqStats.requests, reqStats.responses, (reqStats.requests-reqStats.responses),
                reqStats.errors, reqStats.req_rate.toFixed(4), reqStats.err_rate.toFixed(4),
                reqStats.success, reqStats.redirect, reqStats.client_error, reqStats.server_error,
                reqStats.total_time, reqStats.max_time, reqStats.avg_time.toFixed(2),
                reqStats.total_req_clength,reqStats.max_req_clength,reqStats.avg_req_clength,
                reqStats.total_res_clength,reqStats.max_res_clength,reqStats.avg_res_clength ];
            elemRbyMTable.swstable('rowadd',{row:row});
        }
        elemRbyMTable.swstable('update');

        // Update charts
        var elemRbyMChart = $('#sws_req_cRbM');
        this.updateByMethodChartData(elemRbyMChart.swschart('getchartdata'),'requests');
        elemRbyMChart.swschart('update');

        // Update Error by method chart
        var elemEbMChart = $('#sws_req_cEbM');
        this.updateByMethodChartData(elemEbMChart.swschart('getchartdata'),'errors');
        elemEbMChart.swschart('update');

        // Update Avg Time chart
        var elemRTimeChart = $('#sws_req_cRTime');
        this.updateByMethodChartData(elemRTimeChart.swschart('getchartdata'),'avg_time',function(val){return val.toFixed(4)});
        elemRTimeChart.swschart('update');

        // Update Requests in processing chart
        var elemRTimeChart = $('#sws_req_cRProc');
        this.updateByMethodChartData(elemRTimeChart.swschart('getchartdata'),function(reqStats){return(reqStats.requests-reqStats.responses);});
        elemRTimeChart.swschart('update');
    };


    // Update values on Errors page
    SWSUI.prototype.updateErrors = function() {
        // Update values, if we have data
        if(!this.apistats || !this.apistats.errors) return;

        // Table
        var elemErrTable = $('#sws_err_tCode');
        elemErrTable.swstable('clear');

        // Chart
        var elemErrByCodeChart = $('#sws_err_cCode');
        var chartData = elemErrByCodeChart.swschart('getchartdata');

        if(this.apistats.errors.statuscode) {
            for(var statusCode in this.apistats.errors.statuscode){

                var codeCount = this.apistats.errors.statuscode[statusCode];

                // Update Table
                var row = [statusCode,this.httpStatusCodes[statusCode],codeCount];
                elemErrTable.swstable('rowadd',{row:row});

                // Update Chart Data
                var idx = chartData.labels.indexOf(statusCode);
                if(idx!=-1){
                    chartData.datasets[0].data[idx] = codeCount;
                }else{
                    chartData.labels.push(statusCode);
                    chartData.datasets[0].data.push(codeCount);

                }
            }
        }

        elemErrTable.swstable('update');
        elemErrByCodeChart.swschart('update');

        // Top not found table
        var elem404Table = $('#sws_err_t404');
        elem404Table.swstable('clear');
        if(this.apistats.errors.topnotfound) {
            for(var notFoundPath in this.apistats.errors.topnotfound){
                var pathCount = this.apistats.errors.topnotfound[notFoundPath];
                var row = [notFoundPath,pathCount];
                elem404Table.swstable('rowadd',{row:row});
            }
        }
        elem404Table.swstable('update');

        // Top Server error table
        var elem500Table = $('#sws_err_t500');
        elem500Table.swstable('clear');
        if(this.apistats.errors.topservererror) {
            for(var serverErrorPath in this.apistats.errors.topservererror){
                var pathCount = this.apistats.errors.topservererror[serverErrorPath];
                var row = [serverErrorPath,pathCount];
                elem500Table.swstable('rowadd',{row:row});
            }
        }
        elem500Table.swstable('update');

    };


    // Update values on Last Errors page
    SWSUI.prototype.updateLastErrors = function() {
        // Update values, if we have data
        if(!this.apistats || !this.apistats.lasterrors) return;

        var elemErrTable = $('#sws_lerr_tErr');
        elemErrTable.swstable('clear');
        if(this.apistats.lasterrors && this.apistats.lasterrors.length>0) {
            for(var i=0;i<this.apistats.lasterrors.length;i++){
                var errorInfo = this.apistats.lasterrors[i];
                var row = ['', moment(errorInfo.startts).format(),
                    errorInfo.method,
                    errorInfo.originalUrl,
                    errorInfo.duration,
                    errorInfo.code,
                    errorInfo.codeclass,
                    errorInfo.message,
                    JSON.stringify(errorInfo, null, 4)
                ];
                elemErrTable.swstable('rowadd',{row:row});
            }
        }
        elemErrTable.swstable('update');
    };

    // Update values on Longest Requests page
    SWSUI.prototype.updateLongestReq = function() {
        // Update values, if we have data
        if(!this.apistats || !this.apistats.longestreq) return;

        var elemLReqTable = $('#sws_lreq_tReq');
        elemLReqTable.swstable('clear');
        if(this.apistats.longestreq && this.apistats.longestreq.length>0) {
            for(var i=0;i<this.apistats.longestreq.length;i++){
                var reqInfo = this.apistats.longestreq[i];
                var row = ['', moment(reqInfo.startts).format(),
                    reqInfo.method,
                    reqInfo.originalUrl,
                    reqInfo.duration,
                    reqInfo.code,
                    reqInfo.codeclass,
                    reqInfo.message,
                    JSON.stringify(reqInfo, null, 4)
                ];
                elemLReqTable.swstable('rowadd',{row:row});
            }
        }
        elemLReqTable.swstable('update');
    };

    // Update values on Rates page
    SWSUI.prototype.updateRates = function() {

        // Update values, if we have data
        if(this.apistats==null) return;

        // Update Widgets
        $('#sws_rates_wRqR').swswidget('setvalue', { value:this.getLatestTimelineValue('req_rate').toFixed(4), extra:'req/sec', trend: this.getTimelineTrend('req_rate')} );
        $('#sws_rates_wErR').swswidget('setvalue', { value:this.getLatestTimelineValue('err_rate').toFixed(4), extra:'err/sec', trend: this.getTimelineTrend('err_rate')} );
        $('#sws_rates_wMHT').swswidget('setvalue', this.formatWValDurationMS({ value:this.getLatestTimelineValue('max_time'), trend: this.getTimelineTrend('max_time')}) );
        $('#sws_rates_wAHT').swswidget('setvalue', this.formatWValDurationMS({ value:this.getLatestTimelineValue('avg_time'), trend: this.getTimelineTrend('avg_time')},2) );
        $('#sws_rates_wSHT').swswidget('setvalue', this.formatWValDurationMS({ value:this.getLatestTimelineValue('total_time'), trend: this.getTimelineTrend('total_time')}) );


        $('#sws_rates_wORqR').swswidget('setvalue', { value:this.apistats.all.req_rate.toFixed(4),extra:'req/sec' } );
        $('#sws_rates_wOErR').swswidget('setvalue', { value:this.apistats.all.err_rate.toFixed(4),extra:'err/sec' } );
        $('#sws_rates_wOMHT').swswidget('setvalue', this.formatWValDurationMS({value:this.apistats.all.max_time}) );
        $('#sws_rates_wOAHT').swswidget('setvalue', this.formatWValDurationMS({value:this.apistats.all.avg_time}) );
        $('#sws_rates_wOSHT').swswidget('setvalue', this.formatWValDurationMS({value:this.apistats.all.total_time}) );


        // Update timeline charts
        var elemReqErrRateChart = $('#sws_rates_cRER');
        this.buildTimeSeriesChartData(elemReqErrRateChart.swschart('getchartdata'),['req_rate','err_rate']);
        elemReqErrRateChart.swschart('update');
    };


    // Update values on Payload page
    SWSUI.prototype.updatePayload = function() {

        // Update values, if we have data
        if(this.apistats==null) return;

        // Update Widgets
        $('#sws_payl_wTRqP').swswidget('setvalue', { value:this.apistats.all.total_req_clength, trend: this.getTimelineTrend('total_req_clength')} );
        $('#sws_payl_wMRqP').swswidget('setvalue', { value:this.apistats.all.max_req_clength, trend: this.getTimelineTrend('max_req_clength')});
        $('#sws_payl_wARqP').swswidget('setvalue', { value:this.apistats.all.avg_req_clength.toFixed(0), trend: this.getTimelineTrend('avg_req_clength')});
        $('#sws_payl_wTRsP').swswidget('setvalue', { value:this.apistats.all.total_res_clength, trend: this.getTimelineTrend('total_res_clength')} );
        $('#sws_payl_wMRsP').swswidget('setvalue', { value:this.apistats.all.max_res_clength, trend: this.getTimelineTrend('max_res_clength')});
        $('#sws_payl_wARsP').swswidget('setvalue', { value:this.apistats.all.avg_res_clength.toFixed(0), trend: this.getTimelineTrend('avg_res_clength')});

        // Update timeline charts
        var elemReqPayloadChart = $('#sws_payl_cRqPl');
        this.buildTimeSeriesChartData(elemReqPayloadChart.swschart('getchartdata'),['total_req_clength','avg_req_clength','max_req_clength']);
        elemReqPayloadChart.swschart('update');
        var elemResPayloadChart = $('#sws_payl_cRsPl');
        this.buildTimeSeriesChartData(elemResPayloadChart.swschart('getchartdata'),['total_res_clength','avg_res_clength','max_res_clength']);
        elemResPayloadChart.swschart('update');
    };


    // Update values on API page
    SWSUI.prototype.updateAPI = function() {

        // Update values, if we have data
        if(this.apistats==null) return;

        var elemApiTable = $('#sws_api_tApi');
        elemApiTable.swstable('clear');

        // Show data
        for(var path in this.apistats.apistats){
            var apiPath = this.apistats.apistats[path];
            for( var method in apiPath) {
                var apiOpStats = apiPath[method];
                var apiOpDef = {swagger:false,deprecated:false,operationId:'',summary:'',description:''};
                if( ('apidefs' in this.apistats) && (path in this.apistats.apidefs) && (method in this.apistats.apidefs[path]) ){
                    apiOpDef = this.apistats.apidefs[path][method];
                }
                var row = [ '', path, method,
                    ('swagger' in apiOpDef ? (apiOpDef.swagger ? 'Yes':'No'): 'No'),
                    ('deprecated' in apiOpDef ? (apiOpDef.deprecated ? 'Yes':''): ''),
                    apiOpStats.requests,
                    apiOpStats.responses,
                    apiOpStats.requests-apiOpStats.responses,
                    apiOpStats.errors,
                    apiOpStats.req_rate.toFixed(4),
                    apiOpStats.err_rate.toFixed(4),
                    apiOpStats.success,
                    apiOpStats.redirect,
                    apiOpStats.client_error,
                    apiOpStats.server_error,
                    apiOpStats.max_time,
                    apiOpStats.avg_time.toFixed(2),
                    apiOpStats.avg_req_clength,
                    apiOpStats.avg_res_clength,
                    ('operationId' in apiOpDef ? apiOpDef.operationId : ''),
                    ('summary' in apiOpDef ? apiOpDef.summary : ''),
                    ('description' in apiOpDef ? apiOpDef.description : ''),
                    ('tags' in apiOpDef ? apiOpDef.tags.join(',') : '')
                ];
                elemApiTable.swstable('rowadd',{row:row});
            }
        }
        elemApiTable.swstable('update');
    };

    // Switch API OP page to show specific operation
    SWSUI.prototype.switchToAPIOp = function(method,path) {
        var locHash = '#sws_apiop=' + method + ',' + path;
        window.location.hash = locHash;
    };

    // Update values on API page
    SWSUI.prototype.updateAPIOp = function() {

        // Update values, if we have data
        if(this.apistats==null) return;

        // Update Operation Selector
        var elemSelect = $('#sws_apiop_opsel').swsapiopsel('update',this.apistats);

        var selectedOp = {};

        // If we're on this page without context ( op not specified ) - Take first one in a list and get stats for it
        if(this.activePageContext==null) {
            $('#sws_apiop_opsel').swsapiopsel('getvalue', selectedOp);
            // Set artificial page context
            console.log('Setting context to: path=' + selectedOp.path + ' method='+ selectedOp.method);
            this.activePageContext = selectedOp.method + ',' + selectedOp.path;
            this.refreshStats();
            return;
        }

        // Set selected operation based on page context
        var selectedOp = {};
        var vals = this.activePageContext.split(',',2);
        selectedOp.method = vals[0];
        selectedOp.path = vals[1];
        $('#sws_apiop_opsel').swsapiopsel('setvalue', this.activePageContext);

        console.log('Selected: path=' + selectedOp.path + ' method='+ selectedOp.method);
        $('#sws_apiop_wPath').swswidget('setvalue', { value:'', title: selectedOp.method + ' ' + selectedOp.path, subtitle: this.getAPIOpInfoMarkup(selectedOp.path,selectedOp.method)});

        var opStats = null;
        var opDetails = null;
        if( ('apiop' in this.apistats) && (selectedOp.path in this.apistats.apiop) && (selectedOp.method in this.apistats.apiop[selectedOp.path]) ){
            if('stats' in this.apistats.apiop[selectedOp.path][selectedOp.method]) {
                opStats = this.apistats.apiop[selectedOp.path][selectedOp.method].stats;
            }
            if('details' in this.apistats.apiop[selectedOp.path][selectedOp.method]) {
                opDetails = this.apistats.apiop[selectedOp.path][selectedOp.method].details;
            }
        }
        if(opStats==null) return;

        // Update Widgets
        $('#sws_apiop_wRq').swswidget('setvalue', { value: opStats.requests} );

        $('#sws_apiop_wRRte').swswidget('setvalue', { value:opStats.req_rate.toFixed(4), extra:'req/sec' } );
        $('#sws_apiop_wERte').swswidget('setvalue', { value:opStats.err_rate.toFixed(4), extra:'err/sec' } );
        $('#sws_apiop_wMHt').swswidget('setvalue', this.formatWValDurationMS({value:opStats.max_time}) );
        $('#sws_apiop_wAHt').swswidget('setvalue', this.formatWValDurationMS({value:opStats.avg_time}) );
        $('#sws_apiop_wRrCl').swswidget('setvalue', { value:opStats.avg_req_clength, extra:'bytes'} );

        $('#sws_apiop_wErr').swswidget('setvalue', { value:opStats.errors, total: opStats.requests });
        $('#sws_apiop_wSs').swswidget('setvalue', { value:opStats.success, total:opStats.requests });
        $('#sws_apiop_wRed').swswidget('setvalue', { value:opStats.redirect,total:opStats.requests });
        $('#sws_apiop_wCe').swswidget('setvalue', { value:opStats.client_error,total:opStats.requests});
        $('#sws_apiop_wSe').swswidget('setvalue', { value:opStats.server_error,total:opStats.requests});
        $('#sws_apiop_wReCl').swswidget('setvalue', { value:opStats.avg_res_clength, extra:'bytes'} );

        if(opDetails==null) return;

        var elemParamsTable = $('#sws_apiop_tParams');
        elemParamsTable.swstable('clear');
        if(opDetails.parameters ) {
            for(var paramname in opDetails.parameters ){
                var param = opDetails.parameters[paramname];
                var row = ['',
                    'name' in param ? param.name : '',
                    'in' in param ? param.in : '',
                    'hits' in param ? param.hits : 0,
                    'misses' in param ? param.misses : 0,
                    'type' in param ? param.type : '',
                    'format' in param ? param.format : '',
                    'required' in param ? param.required : '',
                    'description' in param ? param.description : '',
                    JSON.stringify(param, null, 4)
                ];
                elemParamsTable.swstable('rowadd',{row:row});
            }
        }
        elemParamsTable.swstable('update');

    };

    // TODO Move to Service

    SWSUI.prototype.getInfoRowMarkup = function(label,value) {
        return '<div class="sws-info-row"><div class="sws-info-label">'+label+'</div><div class="sws-info-value">'+value+'</div></div>';
    };

    SWSUI.prototype.getAPIOpInfoMarkup = function(path,method) {
        var markup = '';
        if( ('apidefs' in this.apistats) && (path in this.apistats.apidefs) && (method in this.apistats.apidefs[path]) ){
            var apiOpDef = this.apistats.apidefs[path][method];
            var isSwagger = 'No';
            if( ('swagger' in apiOpDef) && apiOpDef.swagger  ) isSwagger = 'Yes';
            markup += this.getInfoRowMarkup('Swagger',isSwagger);
            if( ('deprecated' in apiOpDef) && apiOpDef.deprecated ) {
                markup += this.getInfoRowMarkup('Deprecated','Yes');
            }
            if('operationId' in apiOpDef) markup += this.getInfoRowMarkup('operationId',apiOpDef.operationId);
            if('summary' in apiOpDef) markup += this.getInfoRowMarkup('Summary',apiOpDef.summary);
            if('description' in apiOpDef) markup += this.getInfoRowMarkup('Description',apiOpDef.description);
            if('tags' in apiOpDef) markup += this.getInfoRowMarkup('Tags',apiOpDef.tags.join(','));
        }else{
            markup += this.getInfoRowMarkup('Swagger','No');
        }
        markup += '</div>';
        return markup;
    };

    // PLUGIN ///////////////////////////////////////////// //

    // Prevent against multiple instantiations,
	// handle updates and method calls
	$.fn[pluginName] = function (options, args) {

		var result;

		this.each(function () {
			var _this = $.data(this, pluginName);
			if (typeof options === 'string') {
				if (!_this) {
					logError('Not initialized, can not call method : ' + options);
				}
				else if (!$.isFunction(_this[options]) || options.charAt(0) === '_') {
					logError('No such method : ' + options);
				}
				else {
					if (!(args instanceof Array)) {
						args = [ args ];
					}
					result = _this[options].apply(_this, args);
				}
			}
			else if (typeof options === 'boolean') {
				result = _this;
			}
			else {
				$.data(this, pluginName, new SWSUI(this, $.extend(true, {}, options)));
			}
		});

		return result || this;
	};

})(jQuery, window, document);
