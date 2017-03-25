/*
 * swagger-stats main UI plugin
 */

;(function ($, window, document, undefined) {

	/*global jQuery, console*/

	'use strict';

	var pluginName = 'swaggerstatsui';

	var _default = {};

	_default.settings = {
		testOption: true
	};

	var SWSUI = function (element, options) {

		this.$element = $(element);
		this.elementId = element.id;

        // Auto-refresh interval, 60 seconds by default
        this.refreshInterval = 60;
        this.refreshIntervalId = null;

		// Last retrieved statistics values
		this.apistats = null;
        this.lasterrors = null;

        // Pre-processed stats data
        // Sorted timeline array
        this.timeline_array = [];

        this.tools = {};

        this.palette = ['#1f77b4','#aec7e8','#ff7f0e','#ffbb78','#2ca02c','#98df8a','#d62728','#ff9896','#9467bd','#c5b0d5','#8c564b','#c49c94','#e377c2','#f7b6d2','#7f7f7f','#c7c7c7','#bcbd22','#dbdb8d','#17becf','#9edae5'];

        this.timelineChart = null;
        this.timelineChartData = null;
        this.timelineChartOptions = null;
        // TEMP TODO Remove
        this.timelineChartCntr = 1;

        this.errorsTable = null;
        this.requestsByMethodTable = null;
        this.requestsByMethodChart = null;
        this.requestsByMethodChartData = null;
        this.requestsByMethodChartOptions = null;

        this.apiTable = null;


		this.init(options);

		return {

			// Options (public access)
			options: this.options,

			// Initialize / destroy methods
			init: $.proxy(this.init, this),
			remove: $.proxy(this.remove, this)

			// TODO methods
		};
	};

    SWSUI.prototype.init = function (options) {
		this.options = $.extend({}, _default.settings, options);

		// Tool set for toolbar
        // TODO Consider remaning to Tabs ?
        this.tools = {
            "#sws-summary" :
                {id:'sws-summary', title:'Summary', icon:'fa-line-chart', content:'#sws-content-summary',
                    uri: "/swagger-stats/data", data: "apistats", event: 'sws-ondata-summary' },
            "#sws-requests":
                {id:'sws-requests', title:'Requests', icon:'fa-exchange', content:'#sws-content-requests',
                    uri: "/swagger-stats/data", data: "apistats", event: 'sws-ondata-requests'  },
            "#sws-errors":
                {id:'sws-errors', title:'Last Errors', icon:'fa-exclamation-circle', content:'#sws-content-errors',
                    uri: "/swagger-stats/data/lasterrors", data: "lasterrors", event: 'sws-ondata-lasterrors' },
            "#sws-api":
                {id:'sws-api', title:'API Calls', icon:'fa-code', content:'#sws-content-api',
                    uri: "/swagger-stats/data", data: "apistats", event: 'sws-ondata-api' }
        };

        // Timeline Chart
        this.timelineChartData = {
            labels: [],
            datasets: [
                { label: "Success",type: 'bar',backgroundColor: '#1c84c6',data: [] },
                { label: "Redirect",type: 'bar',backgroundColor: '#d2d2d2',data: [] },
                { label: "Client Error", type: 'bar', backgroundColor: '#f8ac59',data: [] },
                { label: "Server Error", type: 'bar', backgroundColor: '#ed5565',data: [] }
            ]
        };
        this.timelineChartOptions = {
            responsive: true,
            scales: { xAxes: [{stacked: true}],yAxes: [{stacked: true}]}
        };

        // Requests By Method Chart
        this.requestsByMethodChartData = { labels: [], datasets: [{data:[],backgroundColor:[]}] };
        this.requestsByMethodChartOptions = {
            responsive: true,
            legend: { position: 'right' },
            animation: { animateScale: true, animateRotate: true }
            //scales: { xAxes: [{stacked: true}],yAxes: [{stacked: true}]}
        };


        // Define SWS UI Dashboard Layout
        this.layout = new SWSLayout();

        // Consider if need to pass options to layout initialization
        this.layout.init({});

        // Active Page Id
        this.activePageId = null;

        this.destroy();
        //this.render();
        this.renderEx();
        this.startRefresh();
	};

    SWSUI.prototype.renderEx = function () {
        this.$element.empty();

        // Main layout
        var elemNav = $(this.template.nav);
        this.$element.append(elemNav);
        var elemContent = $(this.template.content);
        this.$element.append(elemContent);
        var elemFooter = $(this.template.footer);
        this.$element.append(elemFooter);
        this.buildRefreshControls();

        // Build dashboard

        // TODO Consider: store element in layout ( i.e. elemPage in page )

        // Pages
        for( var pageId in this.layout.pages){
            var page = this.layout.pages[pageId];

            // Add toolbar entry for the page
            var pageNav = $('<li id='+pageId +' class="sws-tool-li"><a href="#'+pageId+'" data-toggle="tooltip" title="'+page.title+'"><i class="fa '+page.icon+'"></i></a></li>');
            $('#sws-toolbar').append(pageNav);
            // Add Content entry for the page
            //var elemPageContent = $('<div id="'+pageId+'_content" style="display: none"></div>');
            var elemPageContent = $('<div id="'+pageId+'_content"></div>');
            elemContent.append(elemPageContent);
            // Page Header - Title
            // TODO Consider Subtitle
            var elemHdr = $('<div class="page-header"><h1>'+page.title+'</h1></div>');
            elemPageContent.append(elemHdr);

            // Page rows
            for( var rowId in page.rows){
                var row = page.rows[rowId];
                var elemRow = $('<div id="'+pageId+'_'+rowId+'" class="row">');
                elemPageContent.append(elemRow);

                // Row Columns
                for( var colId in row.columns ){
                    var col = row.columns[colId];
                    var elemCol = $('<div id="'+colId+'" class="'+col.class+'"></div>');
                    elemRow.append(elemCol);
                    this.renderCol(page, row, col, elemCol);
                }
            }
        }

        this.subscribeEvents();
        this.enableNavigation();
    };

    // Create column element based on definition
    SWSUI.prototype.renderCol = function( page, row, col, elemCol ) {
        if(!('type' in col)) return;

        if( col.type=='widget' ){

            elemCol.swswidget(col);
            return;

        }else if(col.type=='chart'){

            elemCol.swschart( col.options,{ chartdata: col.chartdata, chartoptions: col.chartoptions } );
            return;

        }else if(col.type=='datatable'){
            var tid = elemCol.attr('id')+'_tbl';
            col.options.id = tid;
            col.options.swsId = this.elementId;
            var args = { dataTableSettings: col.dataTableSettings };
            if( 'showDetails' in col ){
                args.showDetails = col.showDetails;
            }
            elemCol.swstable( col.options, args );
            return;
        }
    };

    SWSUI.prototype.enableNavigation = function () {

        var that = this;

        $(window).on('hashchange', function(e) {
            console.log('Navigating to:' + window.location.hash );
            that.setActiveEx(window.location.hash);
        });

        // Determine startup location
        var hashLoc = window.location.hash;
        console.log('Startup location: ' + hashLoc );
        if( hashLoc != ''){
            console.log('Starting at: ' + hashLoc );
            this.setActiveEx(hashLoc);
        }else{
            var startLocHash = '#'+this.layout.startpage;
            console.log('Starting at '+ startLocHash);
            window.location.hash = startLocHash;
            this.setActiveEx(startLocHash);
        }

    };


    // Set specified tool menu to active state
    SWSUI.prototype.setActiveEx = function(pageIdHash){
        console.log('setActive:' + pageIdHash);

        var that = this;

        this.activePageId = pageIdHash.replace('#','');

        // Fallback to default
        if( !(this.activePageId in this.layout.pages) ){
            this.activePageId = this.layout.startpage;
        }

        // Highlight active tool in toolbar and show content
        $('.sws-tool-li').each(function(index){
            if( this.id == that.activePageId){
                $(this).addClass('active');
                $('#'+this.id+'_content').show();
            }else{
                $(this).removeClass('active');
                $('#'+this.id+'_content').hide();
            }
        });

        this.refreshStatsEx();
    };


    SWSUI.prototype.refreshStatsEx = function () {
        console.log('Refreshing with ' + this.refreshInterval + ' sec interval');
        this.startProgress();
        var activeDef = this.layout.pages[this.activePageId];
        var that = this;
        $.ajax({url: activeDef.datauri})
            .done(function( msg ) {
                that[activeDef.datastore] = msg;
                // Pre-process data as needed
                that.preProcessStatsData(activeDef.datastore);
                that.$element.trigger(activeDef.datevent, that);
                that.stopProgress();
            })
            .fail(function( jqXHR, textStatus ){
                that[activeDef.datastore] = null;
                // TODO Clean pre-processed data ?
                that.$element.trigger(activeDef.datevent, that);
                that.stopProgress();
            });
    };


    SWSUI.prototype.buildRefreshControls = function () {
        var elemNavbar = $('#navbar');
        var elemRefresh = $('<div class="sws-refresh-group pull-right"></div>');
        elemNavbar.append(elemRefresh);
        elemRefresh.append($('<span class="sws-refresh sws-refreshing fa fa-refresh" interval="0"></span>'));
        elemRefresh.append($('<span class="sws-refresh sws-pauseresume fa fa-pause" interval="-1"></span>'));
        elemRefresh.append($('<span class="sws-refresh label label-transparent" interval="10">10s</span>'));
        elemRefresh.append($('<span class="sws-refresh label label-transparent" interval="30">30s</span>'));
        elemRefresh.append($('<span class="sws-refresh label label-primary" interval="60">1m</span>'));
    };


    SWSUI.prototype.remove = function () {
		this.destroy();
		$.removeData(this, pluginName);
	};

    SWSUI.prototype.destroy = function () {
        this.$element.empty();
		// Switch off events
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
        this.refreshIntervalId = setInterval( $.proxy(this.refreshStatsEx, this), this.refreshInterval*1000 );
    };

    SWSUI.prototype.pauseOrResumeRefresh = function () {
        if( this.refreshIntervalId != null ){
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
            return false;
        }
        this.refreshIntervalId = setInterval( $.proxy(this.refreshStatsEx, this), this.refreshInterval*1000 );
        return true;
    };

    SWSUI.prototype.refreshStats = function () {
        console.log('Refreshing with ' + this.refreshInterval + ' sec interval');
        this.startProgress();
        var activeDef = this.tools[this.activeToolId];
        var that = this;
        $.ajax({url: activeDef.uri})
            .done(function( msg ) {
                that[activeDef.data] = msg;
                // Pre-process data as needed
                that.preProcessStatsData(activeDef.data);
                that.$element.trigger(activeDef.event, that);
                that.stopProgress();
            })
            .fail(function( jqXHR, textStatus ){
                that[activeDef.data] = null;
                that.$element.trigger(activeDef.event, that);
                that.stopProgress();
            });
    };

    // Pre-process received stats data if needed
    SWSUI.prototype.preProcessStatsData = function(datatype) {

        if(datatype=='apistats'){
            // Core api stats received.

            // Build sorted timeline
            this.timeline_array = [];
            if(this.apistats && this.apistats.timeline) {
                for(var key in this.apistats.timeline){
                    var entry = this.apistats.timeline[key];
                    entry.tc = parseInt(key);
                    var ts = entry.tc*this.apistats.timeline_bucket_duration;
                    entry.timelabel = moment(ts).format('hh:mm:ss');
                    // TODO pre-calculate rates for each timeline bucket
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
        this.$element.off('sws-ondata-summary-ex');
        this.$element.off('sws-ondata-requests');
        this.$element.off('sws-ondata-requests-ex');
        this.$element.off('sws-ondata-lasterrors');
        this.$element.off('sws-ondata-lasterrors-ex');
        this.$element.off('sws-ondata-api');
        this.$element.off('sws-ondata-api-ex');
        $('.sws-refresh').off('click');
	};

    SWSUI.prototype.subscribeEvents = function () {
	    this.unsubscribeEvents();
	    this.$element.on('sws-ondata-summary', $.proxy(this.onDataSummary, this));
        this.$element.on('sws-ondata-summary-ex', $.proxy(this.onDataSummaryEx, this));
        this.$element.on('sws-ondata-requests', $.proxy(this.onDataRequests, this));
        this.$element.on('sws-ondata-requests-ex', $.proxy(this.onDataRequestsEx, this));
        this.$element.on('sws-ondata-lasterrors', $.proxy(this.onDataLastErrors, this));
        this.$element.on('sws-ondata-lasterrors-ex', $.proxy(this.onDataLastErrorsEx, this));
        this.$element.on('sws-ondata-api', $.proxy(this.onDataAPI, this));
        this.$element.on('sws-ondata-api-ex', $.proxy(this.onDataAPIEx, this));
        $('.sws-refresh').on('click', $.proxy(this.onRefreshClick, this));
	};

    SWSUI.prototype.onRefreshClick = function(Event){
        if(!Event.target) return;
        var interval = parseInt($(Event.target).attr('interval'));
        if(interval==0){
            // Refresh immediately
            this.refreshStatsEx();
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
        this.showSummary();
    };

    SWSUI.prototype.onDataSummaryEx = function(){
        this.showSummaryEx();
    };

    // TODO Rename to Update Summary
    // TODO Store pointer to update method in layout via proxy ?
    SWSUI.prototype.showSummaryEx = function() {

        // Update values, if we have data
        if(this.apistats==null) return;

        // Update Widgets
        $('#sws_summ_wRq').swswidget('setvalue', { value:this.apistats.all.requests, trend: this.getTimelineTrend('requests')} );
        $('#sws_summ_wRRte').swswidget('setvalue', { value:this.getCurrentRate('requests'), subtitle: this.getCurrentRateSubtitle('Req/sec on last ')});
        $('#sws_summ_wERte').swswidget('setvalue', { value:this.getCurrentRate('errors'), subtitle: this.getCurrentRateSubtitle('Err/sec on last ')});
        $('#sws_summ_wAHt').swswidget('setvalue', { value:this.apistats.all.avg_time.toFixed(2), trend:this.getTimelineTrend('avg_time')});
        $('#sws_summ_wMHt').swswidget('setvalue', { value:this.apistats.all.max_time, trend:this.getTimelineTrend('max_time')});
        $('#sws_summ_wRrCl').swswidget('setvalue', { value:this.apistats.all.total_req_clength, trend:this.getTimelineTrend('total_req_clength')} );
        $('#sws_summ_wErr').swswidget('setvalue', { value:this.apistats.all.errors, total: this.apistats.all.requests, trend: this.getTimelineTrend('errors')} );
        $('#sws_summ_wSs').swswidget('setvalue', { value:this.apistats.all.success, total:this.apistats.all.requests, trend: this.getTimelineTrend('success')});
        $('#sws_summ_wRed').swswidget('setvalue', { value:this.apistats.all.redirect,total:this.apistats.all.requests,trend: this.getTimelineTrend('redirect')});
        $('#sws_summ_wCe').swswidget('setvalue', { value:this.apistats.all.client_error,total:this.apistats.all.requests,trend:this.getTimelineTrend('client_error')});
        $('#sws_summ_wSe').swswidget('setvalue', { value:this.apistats.all.server_error,total:this.apistats.all.requests,trend:this.getTimelineTrend('server_error')});
        $('#sws_summ_wReCl').swswidget('setvalue', { value:this.apistats.all.total_res_clength, trend:this.getTimelineTrend('total_res_clength')} );

        // Update timeline chart
        var elemTimelineChart = $('#sws_summ_cTl');
        this.buildTimelineChartData(elemTimelineChart.swschart('getchartdata'));
        elemTimelineChart.swschart('update');
    };

    SWSUI.prototype.onDataRequests = function(){
        this.showRequests();
    };

    SWSUI.prototype.onDataRequestsEx = function(){
        this.showRequestsEx();
    };

    SWSUI.prototype.showRequestsEx = function() {

        // Update values, if we have data
        if(this.apistats==null) return;

        // Table
        var elemRbyMTable = $('#sws_req_tRbM');
        elemRbyMTable.swstable('clear');
        for( var method in this.apistats.method){
            var reqStats = this.apistats.method[method];
            var row = [ method, reqStats.requests, reqStats.errors, reqStats.req_rate.toFixed(4), reqStats.err_rate.toFixed(4),
                reqStats.success, reqStats.redirect, reqStats.client_error, reqStats.server_error,
                reqStats.total_time, reqStats.max_time, reqStats.avg_time.toFixed(2),
                reqStats.total_req_clength,reqStats.max_req_clength,reqStats.avg_req_clength,
                reqStats.total_res_clength,reqStats.max_res_clength,reqStats.avg_res_clength ];
            elemRbyMTable.swstable('rowadd',{row:row});
        }
        elemRbyMTable.swstable('update');

        // Update requests chart
        var elemRbyMChart = $('#sws_req_cRbM');
        var chartData = elemRbyMChart.swschart('getchartdata');
        for (var method in this.apistats.method) {
            var reqStats = this.apistats.method[method];
            var idx = chartData.labels.indexOf(method);
            if (idx != -1) {
                chartData.datasets[0].data[idx] = reqStats.requests;
            } else {
                idx = chartData.labels.length;
                chartData.labels.push(method);
                chartData.datasets[0].data.push(reqStats.requests);
                if (idx >= this.palette.length) idx = 0;
                chartData.datasets[0].backgroundColor.push(this.palette[idx]);
            }
        }
        elemRbyMChart.swschart('update');
    };

    SWSUI.prototype.onDataLastErrors = function(){
        this.showErrors();
    };

    SWSUI.prototype.onDataLastErrorsEx = function(){
        this.showErrorsEx();
    };

    SWSUI.prototype.showErrorsEx = function() {
        // Update values, if we have data
        if(this.lasterrors==null) return;

        var elemErrTable = $('#sws_err_tErr');
        elemErrTable.swstable('clear');
        if(this.lasterrors.last_errors && this.lasterrors.last_errors.length>0) {
            for(var i=0;i<this.lasterrors.last_errors.length;i++){
                var errorInfo = this.lasterrors.last_errors[i];
                var row = ['', moment(errorInfo.startts).format(),
                    errorInfo.method,
                    errorInfo.originalUrl,
                    errorInfo.code,
                    errorInfo.codeclass,
                    errorInfo.duration,
                    errorInfo.message,
                    JSON.stringify(errorInfo, null, 4)
                ];
                elemErrTable.swstable('rowadd',{row:row});
            }
        }
        elemErrTable.swstable('update');
    };



    SWSUI.prototype.onDataAPI = function(){
        this.showAPI();
    };

    SWSUI.prototype.onDataAPIEx = function(){
        this.showAPIEx();
    };

    SWSUI.prototype.showAPIEx = function() {

        // Update values, if we have data
        if(this.apistats==null) return;

        var elemApiTable = $('#sws_api_tApi');
        elemApiTable.swstable('clear');

        // Show data
        for(var path in this.apistats.api){
            var apiPath = this.apistats.api[path];
            for( var method in apiPath) {
                var apiPathMethod = apiPath[method];
                var row = [ '', path, method,
                    ('swagger' in apiPathMethod ? (apiPathMethod.swagger ? 'Yes':'No'): 'No'),
                    ('deprecated' in apiPathMethod ? (apiPathMethod.deprecated ? 'Yes':''): ''),
                    apiPathMethod.stats.requests,
                    apiPathMethod.stats.errors,
                    apiPathMethod.stats.req_rate.toFixed(4),
                    apiPathMethod.stats.err_rate.toFixed(4),
                    apiPathMethod.stats.success,
                    apiPathMethod.stats.redirect,
                    apiPathMethod.stats.client_error,
                    apiPathMethod.stats.server_error,
                    apiPathMethod.stats.max_time,
                    apiPathMethod.stats.avg_time.toFixed(2),
                    apiPathMethod.stats.avg_req_clength,
                    apiPathMethod.stats.avg_res_clength,
                    ('operationId' in apiPathMethod ? apiPathMethod.operationId : ''),
                    ('summary' in apiPathMethod ? apiPathMethod.summary : ''),
                    ('description' in apiPathMethod ? apiPathMethod.description : ''),
                    ('tags' in apiPathMethod ? apiPathMethod.tags.join(',') : '')
                ];
                elemApiTable.swstable('rowadd',{row:row});
            }
        }
        elemApiTable.swstable('update');
    };

// ////////////////////////////////////////////////////// //

    SWSUI.prototype.render = function () {
		this.$element.empty();
        this.buildLayout();
        this.buildNavigation();
        this.buildRefreshControls();
        this.subscribeEvents();
	};

    SWSUI.prototype.template = {
        nav: '<nav class="navbar navbar-default navbar-fixed-top"> \
                 <div class="container-fluid"> \
                    <div class="navbar-header"> \
                        <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar"> \
                            <span class="sr-only">Toggle navigation</span> \
                            <span class="icon-bar"></span> \
                            <span class="icon-bar"></span> \
                            <span class="icon-bar"></span> \
                        </button> \
                        <a class="navbar-brand" href="#">swagger-stats</a> \
                    </div> \
                    <div id="navbar" class="navbar-collapse collapse" aria-expanded="false" style="height: 0.555556px;"> \
                        <ul id="sws-toolbar" class="nav navbar-nav"> \
                        </ul> \
                    </div> \
                 </div> \
               </nav>',
        content: '<div id="sws-content" class="container-fluid page-content"></div>',
        footer:'<footer class="bd-footer text-muted"> \
                    <div class="container-fluid"> \
                        <p><strong>swagger-stats v.0.40.1</strong></p> \
                        <p>Copyright &copy; 2017 <a href="#">slana.tech</a></p> \
                    </div> \
                </footer>',
        datatable: '<div class="col-lg-12"><div class="swsbox float-e-margins"><div class="swsbox-content">\
                    <div class="table-responsive">\
                    <table id="%id%" class="table table-striped table-bordered table-condensed table-hover" >\
                        <thead><tr>%headers%</tr></thead>\
                        <tbody></tbody>\
                    </table>\
                    </div></div></div></div>',
        tableheader: '<th style="%style%">%title%</th>',
        timelineChart: '<div class="col-lg-12">\
                        <div class="swsbox float-e-margins">\
                        <div class="swsbox-content">\
                        <h4>%title%</h4>\
                        <div>\
                        <canvas id="sws-chart-timeline" height="80px"></canvas>\
                        </div></div></div></div>',
        reqByMethodChart: '<div class="col-lg-4">\
                        <div class="swsbox float-e-margins">\
                        <div class="swsbox-content">\
                        <h4>%title%</h4>\
                        <div>\
                        <canvas id="sws-chart-reqbymethod" height="150px"></canvas>\
                        </div></div></div></div>'
    };

    /*
*   <li class="active"><a href="#main" data-toggle="tooltip" title="Summary"><i class="fa fa-line-chart"></i></a></li> \
 <li><a href="#requests" data-toggle="tooltip" title="Requests"><i class="fa fa-exchange"></i></a></li> \
 <li><a href="#errors" data-toggle="tooltip" title="Errors"><i class="fa fa-ban"></i></a></li> \

 * */


    SWSUI.prototype.buildLayout = function () {
        var elemNav = $(this.template.nav);
        this.$element.append(elemNav);

        var elemContent = $(this.template.content);
        this.$element.append(elemContent);

        var elemFooter = $(this.template.footer);
        this.$element.append(elemFooter);

        // Create empty content for pages
        this.showSummary();
        this.showRequests();
        this.showErrors();
        this.showAPI();

    };

    SWSUI.prototype.buildNavigation = function () {

        var that = this;

        for( var toolId in this.tools) {
            var tool = this.tools[toolId];
            var toolElem = $('<li id='+tool.id+' class="sws-tool-li"><a href="#'+tool.id+'" data-toggle="tooltip" title="'+tool.title+'"><i class="fa '+tool.icon+'"></i></a></li>');
            $('#sws-toolbar').append(toolElem);
        }

        $(window).on('hashchange', function(e) {
            console.log('Navigating to:' + window.location.hash );
            that.setActive(window.location.hash);
        });

        // Determine startup location
        var hashLoc = window.location.hash;
        console.log('Startup location: ' + hashLoc );
        if( hashLoc != ''){
            console.log('Starting at: ' + hashLoc );
            this.setActive(hashLoc);
        }else{
            console.log('Starting at Summary');
            window.location.hash = '#sws-summary';
            this.setActive('#sws-summary');
        }

    };

    // Set specified tool menu to active state
    SWSUI.prototype.setActive = function(toolId){
        console.log('setActive:' + toolId);

        this.activeToolId = toolId;

        // Highlight active tool in toolbar
        $('.sws-tool-li').each(function(index){
           var thisToolId = '#'+ this.id;
           if( thisToolId == toolId){
               $(this).addClass('active');
           }else{
               $(this).removeClass('active');
           }
        });

        this.refreshActive();
    };

    SWSUI.prototype.refreshActive = function(){
        var toolrec = null;
        if( !(this.activeToolId in this.tools) ){
            return;
        }
        // Show content if current, hide content if not
        for( var toolId in this.tools) {
            if(toolId==this.activeToolId){
                $(this.tools[toolId].content).show();
            }else{
                $(this.tools[toolId].content).hide();
            }
        }
        this.refreshStats();
    };

    // SWS UI Widgets definitions
    SWSUI.prototype.widgets = {
        sws_summ_wRq  : { id:'sws_summ_wRq', title: 'Requests', subtitle:'Total received requests' },
        sws_summ_wRRte: { id:'sws_summ_wRRte', title: 'Request Rate', subtitle:'Req/sec on last time interval' },
        sws_summ_wERte: { id:'sws_summ_wERte', title: 'Error Rate', subtitle:'Err/sec on last time interval', postProcess:'redIfNonZero' },
        sws_summ_wHt  : { id:'sws_summ_wHt', title: 'Handle Time', subtitle:'Total Handle Time(ms)' },
        sws_summ_wAHt : { id:'sws_summ_wAHt', title: 'Avg Handle Time', subtitle:'Average Handle Time(ms)' },
        sws_summ_wMHt : { id:'sws_summ_wMHt', title: 'Max Handle Time', subtitle:'Max Handle Time(ms)' },
        sws_summ_wRrCl: { id:'sws_summ_wRrCl', title: 'Requests Payload', subtitle:'Total content len (bytes)' },
        sws_summ_wErr : { id:'sws_summ_wErr', title: 'Errors', subtitle:'Total Error Responses', postProcess:'redIfNonZero' },
        sws_summ_wSs  : { id:'sws_summ_wSs', title: 'Success', subtitle:'Success Responses', postProcess:'successIfNonZero' },
        sws_summ_wRed : { id:'sws_summ_wRed', title: 'Redirect', subtitle:'Redirect Responses' },
        sws_summ_wCe  : { id:'sws_summ_wCe', title: 'Client Error', subtitle:'Client Error Responses', postProcess:'redIfNonZero' },
        sws_summ_wSe  : { id:'sws_summ_wSe', title: 'Server Error', subtitle:'Server Error Responses', postProcess:'redIfNonZero' },
        sws_summ_wReCl: { id:'sws_summ_wReCl', title: 'Responses Payload', subtitle:'Total content len (bytes)' }
    };

    // TODO move to layout creation
    SWSUI.prototype.createWidgetEx = function(def) {
        var wel = $('<div id="'+def.id+'" class="col-md-2"></div>');
        wel.swswidget(def);
        return wel;
    };

    // Rate calcuated based on count of items per number of seconds elapsed since startts, and until endts or current time
    // Rate will change depending on moment of observation
    // I.e. if count does not keep growing with the same speed ( rate :) rate will be dropping over time
    SWSUI.prototype.getRate = function(count,startts,endts) {
        endts = typeof endts !== 'undefined' ? endts : Date.now();
        var elapsed = (endts - startts)/1000;
        return (count / elapsed).toFixed(2);
    };

    // Get request rate from last time bucket in timeline
    SWSUI.prototype.getCurrentRate = function(prop){
        if(this.apistats==null) return 0;
        var count = 0;
        var startts = 0;
        try {
            var last = this.apistats.timeline[this.apistats.timeline_bucket_current];
            count = last[prop];
            startts = this.apistats.timeline_bucket_current * this.apistats.timeline_bucket_duration;
        }catch(e){
            return 0;
        }
        return this.getRate(count,startts);
    };

    SWSUI.prototype.getCurrentRateSubtitle = function(prefix) {
        var secs = 0;
        if( this.apistats && ('timeline_bucket_duration' in this.apistats) ) {
            secs = this.apistats.timeline_bucket_duration / 1000;
        }
        return prefix + ( secs != 0 ? secs.toString() + ' sec' : 'last time interval' );
    };


    SWSUI.prototype.showSummary = function() {

        var elemContent = $('#sws-content');
        var elemSummary = elemContent.find('#sws-content-summary');

        if( !elemSummary.length ){

            var toolrec = this.tools['#sws-summary'];

            // Creating DOM for Summary
            elemSummary = $('<div id="sws-content-summary"></div>');
            elemContent.append(elemSummary);

            var elemHdr = $('<div class="page-header"><h1>'+toolrec.title+'</h1></div>');
            elemSummary.append(elemHdr);

            // First row with number boxes
            var elemRow1 = $('<div id="sws-content-summary-row1" class="row">');
            elemSummary.append(elemRow1);

            elemRow1.append(this.createWidgetEx(this.widgets.sws_summ_wRq));
            elemRow1.append(this.createWidgetEx(this.widgets.sws_summ_wRRte));
            elemRow1.append(this.createWidgetEx(this.widgets.sws_summ_wERte));
            elemRow1.append(this.createWidgetEx(this.widgets.sws_summ_wAHt));
            elemRow1.append(this.createWidgetEx(this.widgets.sws_summ_wMHt));
            elemRow1.append(this.createWidgetEx(this.widgets.sws_summ_wRrCl));

            var elemRow2 = $('<div id="sws-content-summary-row2" class="row">');
            elemSummary.append(elemRow2);

            elemRow2.append(this.createWidgetEx(this.widgets.sws_summ_wErr));
            elemRow2.append(this.createWidgetEx(this.widgets.sws_summ_wSs));
            elemRow2.append(this.createWidgetEx(this.widgets.sws_summ_wRed));
            elemRow2.append(this.createWidgetEx(this.widgets.sws_summ_wCe));
            elemRow2.append(this.createWidgetEx(this.widgets.sws_summ_wSe));
            elemRow2.append(this.createWidgetEx(this.widgets.sws_summ_wReCl));


            var elemRow3 = $('<div id="sws-content-summary-row3" class="row">');
            elemSummary.append(elemRow3);

            var timlineChartHTML = this.template.timelineChart
                .replace('%title%','Requests and Responces over last 60 minutes');
            var elemChart = $(timlineChartHTML);
            elemRow3.append(elemChart);
        }

        // Update values, if we have data
        if(this.apistats==null) return;

        $('#sws_summ_wRq').swswidget('setvalue', { value:this.apistats.all.requests, trend: this.getTimelineTrend('requests')} );
        $('#sws_summ_wRRte').swswidget('setvalue', { value:this.getCurrentRate('requests'), subtitle: this.getCurrentRateSubtitle('Req/sec on last ')});
        $('#sws_summ_wERte').swswidget('setvalue', { value:this.getCurrentRate('errors'), subtitle: this.getCurrentRateSubtitle('Err/sec on last ')});
        $('#sws_summ_wAHt').swswidget('setvalue', { value:this.apistats.all.avg_time.toFixed(2), trend:this.getTimelineTrend('avg_time')});
        $('#sws_summ_wMHt').swswidget('setvalue', { value:this.apistats.all.max_time, trend:this.getTimelineTrend('max_time')});
        $('#sws_summ_wRrCl').swswidget('setvalue', { value:this.apistats.all.total_req_clength, trend:this.getTimelineTrend('total_req_clength')} );

        $('#sws_summ_wErr').swswidget('setvalue', { value:this.apistats.all.errors, total: this.apistats.all.requests, trend: this.getTimelineTrend('errors')} );
        $('#sws_summ_wSs').swswidget('setvalue', { value:this.apistats.all.success, total:this.apistats.all.requests, trend: this.getTimelineTrend('success')});
        $('#sws_summ_wRed').swswidget('setvalue', { value:this.apistats.all.redirect,total:this.apistats.all.requests,trend: this.getTimelineTrend('redirect')});
        $('#sws_summ_wCe').swswidget('setvalue', { value:this.apistats.all.client_error,total:this.apistats.all.requests,trend:this.getTimelineTrend('client_error')});
        $('#sws_summ_wSe').swswidget('setvalue', { value:this.apistats.all.server_error,total:this.apistats.all.requests,trend:this.getTimelineTrend('server_error')});
        $('#sws_summ_wReCl').swswidget('setvalue', { value:this.apistats.all.total_res_clength, trend:this.getTimelineTrend('total_res_clength')} );

        this.updateTimelineChart();

    };

    SWSUI.prototype.showRequests = function() {

        var elemContent = $('#sws-content');
        var elemRequests = elemContent.find('#sws-content-requests');

        if( !elemRequests.length ) {

            var toolrec = this.tools['#sws-requests'];

            elemRequests = $('<div id="sws-content-requests"></div>');
            elemContent.append(elemRequests);

            var elemHdr = $('<div class="page-header"><h1>'+toolrec.title+'</h1></div>');
            elemRequests.append(elemHdr);

            var elemRow1 = $('<div id="sws-content-requests-row1" class="row">');
            elemRequests.append(elemRow1);

            var tableHTML = this.template.datatable
                .replace('%id%','sws-table-requestsbymethod')
                .replace('%headers%',this.generateDatatableHeaders(
                    [   ['Method','width:10%'],
                        ['Requests',''],
                        ['Errors',''],
                        ['Success',''],
                        ['Redirect',''],
                        ['Client Error',''],
                        ['Server Error',''],
                        ['Max Time(ms)',''],
                        ['Avg Time(ms)',''],
                        ['Avg Req Payload',''],
                        ['Avg Res Payload','']
                    ]
                ));

            var elemTable = $(tableHTML);
            elemRow1.append(elemTable);
            this.requestsByMethodTable = $('#sws-table-requestsbymethod').DataTable({
                pageLength: 25,
                responsive: true,
                bPaginate: false,
                bFilter:false,
                bInfo: false,
                "order": [[ 1, "desc" ]],
                "createdRow": function ( row, data, index ) {
                    $('td', row).eq(0).empty().append('<span class="badge badge-info">'+data[0]+'</span>');
                    $('td', row).eq(1).empty().append('<strong>'+data[1]+'</strong>');
                    if( data[2] > 0) $('td', row).eq(2).empty().append('<span class="badge badge-danger">'+data[2]+'</span>');
                    if( data[5] > 0) $('td', row).eq(5).empty().append('<span class="badge badge-danger">'+data[5]+'</span>');
                    if( data[6] > 0) $('td', row).eq(6).empty().append('<span class="badge badge-danger">'+data[6]+'</span>');
                }
            });

            var elemRow2 = $('<div id="sws-content-requests-row2" class="row">');
            elemRequests.append(elemRow2);

            var reqByMethodHTML = this.template.reqByMethodChart
                .replace('%title%','Requests by Method');
            var elemChart = $(reqByMethodHTML);
            elemRow2.append(elemChart);

            // TEST
            var cel = $('<div id="sws-test-chart" class="col-lg-4"></div>');
            cel.swschart({title:'My chart', height:"200px"}, {chartdata:this.requestsByMethodChartData, chartoptions:this.requestsByMethodChartOptions});
            elemRow2.append(cel);

        }

        this.updateRequestsByMethodTable();
        this.updateRequestsByMethodChart();
    };


    SWSUI.prototype.showErrors = function() {

        var elemContent = $('#sws-content');
        var elemErrors = elemContent.find('#sws-content-errors');

        if( !elemErrors.length ){

            var toolrec = this.tools['#sws-errors'];
            elemErrors = $('<div id="sws-content-errors"></div>');
            elemContent.append(elemErrors);

            var elemHdr = $('<div class="page-header"><h1>'+toolrec.title+'</h1></div>');
            elemErrors.append(elemHdr);

            var elemRow1 = $('<div id="sws-content-errors-row-1" class="row">');
            elemErrors.append(elemRow1);

            var tableHTML = this.template.datatable
                .replace('%id%', 'sws-table-errors')
                .replace('%headers%', this.generateDatatableHeaders(
                    [
                        ['', 'width:0%;'],['Time', 'width:20%;'], ['Method', ''], ['URL', 'width:30%;'],
                        ['Code', ''], ['Class', ''], ['Duration', ''], ['Message', 'width:30%;']
                        //['Json', '']
                    ]
                ));

            var elemTable = $(tableHTML);
            elemRow1.append(elemTable);
            this.errorsTable = $('#sws-table-errors').DataTable({
                pageLength: 25,
                columnDefs: [{ "targets": [0], "searchable": false, "orderable": false, "visible": true }],
                responsive: true,
                deferRender: true,
                dom: '<"html5buttons"B>lTfgitp',
                buttons: [{extend: 'copy'}, {extend: 'csv'}],
                "order": [[1, "desc"]],
                "createdRow": function (row, data, index) {
                    $('td', row).eq(0).empty().addClass('sws-row-expand text-center cursor-pointer').append('<i class="fa fa-caret-right">');
                    $('td', row).eq(2).empty().append('<span class="badge badge-info">' + data[2] + '</span>');
                    $('td', row).eq(4).empty().append('<strong>' + data[4] + '</strong>');
                }
            });

            var swsui = this;
            // Add event listener for opening and closing details
            $('#sws-table-errors').on('click', 'td.sws-row-expand', function () {
                var tr = $(this).closest('tr');
                var tdi = $(this).find('i');
                var row = swsui.errorsTable.row( tr );
                if ( row.child.isShown() ) {
                    row.child.hide();
                    tdi.removeClass('fa-caret-down');
                    tdi.addClass('fa-caret-right');
                }
                else {
                    row.child( '<pre><code class="json">'+row.data()[8]+'</code></pre>' ).show();
                    $('pre code:not(.hljs)').each(function(i, block) {
                        hljs.highlightBlock(block);
                    });
                    tdi.removeClass('fa-caret-right');
                    tdi.addClass('fa-caret-down');
                }
            } );

        }

        this.updateErrorsTable();
    };


    SWSUI.prototype.showAPI = function() {

        var elemContent = $('#sws-content');
        var elemAPI = elemContent.find('#sws-content-api');

        if( !elemAPI.length ){

            var toolrec = this.tools['#sws-api'];

            elemAPI = $('<div id="sws-content-api"></div>');
            elemContent.append(elemAPI);

            var elemHdr = $('<div class="page-header"><h1>'+toolrec.title+'</h1></div>');
            elemAPI.append(elemHdr);

            var elemRow1 = $('<div id="sws-content-api-row-1" class="row">');
            elemAPI.append(elemRow1);

            var elemColTable = $('<div id="sws-table-api-placeholder" class="col-lg-12">');
            elemRow1.append(elemColTable);

            this.apiTable = $(elemColTable).swstables({});
        }

        // TODO
        $('#sws-table-api-placeholder').swstables('update', this.apistats );
    };

    //headersDefs: array of pairs [ [<Title>,<style>], ... ]
    SWSUI.prototype.generateDatatableHeaders = function(headersDefs) {
        var that = this;
        var headers = '';
        headersDefs.forEach(function(v,i,a){
            headers += that.template.tableheader.replace('%title%',v[0]).replace('%style%',v[1]);
        });
        return headers;
    };

    SWSUI.prototype.updateErrorsTable = function() {

        if( this.errorsTable == null ) return;

        // Show data
        this.errorsTable.clear();
        if(this.lasterrors && this.lasterrors.last_errors && this.lasterrors.last_errors.length>0){
            for(var i=0;i<this.lasterrors.last_errors.length;i++){
                var errorInfo = this.lasterrors.last_errors[i];
                this.errorsTable.row.add([
                    '',
                    moment(errorInfo.startts).format(),
                    errorInfo.method,
                    errorInfo.originalUrl,
                    errorInfo.code,
                    errorInfo.codeclass,
                    errorInfo.duration,
                    errorInfo.message,
                    JSON.stringify(errorInfo, null, 4)
                ]);
            }
            this.errorsTable.draw(false);
        }
    };

    SWSUI.prototype.updateRequestsByMethodTable = function() {

        if(this.requestsByMethodTable == null ) return;

        // Show data
        this.requestsByMethodTable.clear();
        if(this.apistats && this.apistats.method){
            for( var method in this.apistats.method){
                var reqStats = this.apistats.method[method];
                this.requestsByMethodTable.row.add([
                    method,
                    reqStats.requests,
                    reqStats.errors,
                    reqStats.success,
                    reqStats.redirect,
                    reqStats.client_error,
                    reqStats.server_error,
                    reqStats.max_time,
                    reqStats.avg_time.toFixed(2),
                    reqStats.avg_req_clength,
                    reqStats.avg_res_clength
                ]);
            }
            this.requestsByMethodTable.draw(false);
        }
    };

    SWSUI.prototype.buildTimelineChartData = function(chartdata) {
        // Shift, until beginning match
        // first label corresponds to first timelabel in timeline_array
        var start_label = this.timeline_array[0].timelabel;
        while( (chartdata.labels.length>0)
                && (chartdata.labels[0] != start_label) ){
            chartdata.labels.shift();
            chartdata.datasets[0].data.shift();
            chartdata.datasets[1].data.shift();
            chartdata.datasets[2].data.shift();
            chartdata.datasets[3].data.shift();
        }
        // Update
        var j = 0;
        for(j=0;j<chartdata.labels.length;j++) {
            chartdata.datasets[0].data[j] = this.timeline_array[j].success;
            chartdata.datasets[1].data[j] = this.timeline_array[j].redirect;
            chartdata.datasets[2].data[j] = this.timeline_array[j].client_error;
            chartdata.datasets[3].data[j] = this.timeline_array[j].server_error;
        }
        // Add
        for(;j<this.timeline_array.length;j++) {
            chartdata.labels.push(this.timeline_array[j].timelabel);
            chartdata.datasets[0].data.push(this.timeline_array[j].success);
            chartdata.datasets[1].data.push(this.timeline_array[j].redirect);
            chartdata.datasets[2].data.push(this.timeline_array[j].client_error);
            chartdata.datasets[3].data.push(this.timeline_array[j].server_error);
        }
    };

    SWSUI.prototype.updateTimelineChart = function() {
        if(!this.apistats) return;  // nothing to update - dom creation at startup

        this.buildTimelineChartData(this.timelineChartData);

        if( this.timelineChart == null ) {
            var ctxChartTimeline = document.getElementById("sws-chart-timeline").getContext("2d");
            this.timelineChart = new Chart(ctxChartTimeline, {
                type: 'bar',
                data: this.timelineChartData,
                options: this.timelineChartOptions
            });
        }

        this.timelineChart.update();
    };


    SWSUI.prototype.updateRequestsByMethodChart = function() {
        if(!this.apistats || !this.apistats.method) return;  // nothing to update - dom creation at startup

        for (var method in this.apistats.method) {
            var reqStats = this.apistats.method[method];
            var idx = this.requestsByMethodChartData.labels.indexOf(method);
            if (idx != -1) {
                this.requestsByMethodChartData.datasets[0].data[idx] = reqStats.requests;
            } else {
                idx = this.requestsByMethodChartData.labels.length;
                this.requestsByMethodChartData.labels.push(method);
                this.requestsByMethodChartData.datasets[0].data.push(reqStats.requests);
                if (idx >= this.palette.length) idx = 0;
                this.requestsByMethodChartData.datasets[0].backgroundColor.push(this.palette[idx]);
            }
        }

        if( this.requestsByMethodChart == null ) {
            var ctxChartReqByMethod = document.getElementById("sws-chart-reqbymethod").getContext("2d");
            this.requestsByMethodChart = new Chart(ctxChartReqByMethod, {
                type: 'doughnut',
                data: this.requestsByMethodChartData,
                options: this.requestsByMethodChartOptions
            });
        }

        this.requestsByMethodChart.update();
        // TEST
        $('#sws-test-chart').swschart('update');
    };


    // [sv2] Calculate linear regression to show trend
    // y:[0,1,2 ...], x[val0,val1,val2 ...]
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
            //lr['intercept'] = (sum_y - lr.slope * sum_x)/n;
            //lr['r2'] = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);
        }
        var res = (slope > 0 ? 'up' : (slope<0 ? 'down': '') );
        return res;
    };

    // [sv2] Calculate linear regression to show trend
    // y:[0,1,2 ...], x[val0,val1,val2 ...]
    SWSUI.prototype.linearRegression = function (y,x) {
        var lr = {};
        var n = y.length;
        var sum_x = 0;
        var sum_y = 0;
        var sum_xy = 0;
        var sum_xx = 0;
        var sum_yy = 0;
        for (var i = 0; i < y.length; i++) {
            sum_x += x[i];
            sum_y += y[i];
            sum_xy += (x[i]*y[i]);
            sum_xx += (x[i]*x[i]);
            sum_yy += (y[i]*y[i]);
        }
        var divby = (n*sum_xx - sum_x * sum_x);
        lr['slope'] = divby == 0 ? 0 : (n * sum_xy - sum_x * sum_y) / divby;
        //lr['intercept'] = (sum_y - lr.slope * sum_x)/n;
        //lr['r2'] = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);
        return lr;
    }


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
