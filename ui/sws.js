/*
 * swagger-stats UI plugin
 */

;(function ($, window, document, undefined) {

	/*global jQuery, console*/

	'use strict';

	var pluginName = 'swaggerstatsui';

	var _default = {};

	_default.settings = {
		testOption: true,
        refreshInterval: 1     // TODO 10 seconds refresh by default
	};

	var SWSUI = function (element, options) {

		this.$element = $(element);
		this.elementId = element.id;

		this.apistats = null;
        this.tools = {};

        this.timelineChart = null;
        this.timelineChartData = null;
        this.timelineChartOptions = null;

        this.errorsTable = null;
        this.requestsByMethodTable = null;

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
        this.tools = {
            "#sws-summary" : {id:'sws-summary', title:'Summary', icon:'fa-line-chart', content:'#sws-content-summary' },
            "#sws-requests": {id:'sws-requests', title:'Requests', icon:'fa-exchange', content:'#sws-content-requests' },
            "#sws-errors": {id:'sws-errors', title:'Last Errors', icon:'fa-exclamation-circle', content:'#sws-content-errors'}
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

        this.destroy();
		this.subscribeEvents();

        console.log("Refresh: "+this.options.refreshInterval);
        this.refreshApiStats(this);
        //setInterval( this.refreshApiStats, this.options.refreshInterval*5000, this );

        this.render();
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

    SWSUI.prototype.refreshApiStats = function (swsui) {
        $.ajax({url: "/api-stats/data.json"})
            .done(function( msg ) {
                swsui.apistats = msg;
                console.log('swagger-stats: statistics data updated');
                // TODO Emit event
                swsui.refreshActive();
            })
            .fail(function( jqXHR, textStatus ){
                that.apistats = null;
                console.log('swagger-stats: ERROR - unable to get statistics data: %d - %s',jqXHR.status,textStatus);
                // TODO Emit event
                swsui.refreshActive();
            });
    };

    SWSUI.prototype.unsubscribeEvents = function () {
        // TODO Define events
		this.$element.off('nodeChecked');
	};

    SWSUI.prototype.subscribeEvents = function () {
        // TODO Define events
	    this.unsubscribeEvents();
		if (typeof (this.options.onNodeChecked) === 'function') {
			this.$element.on('nodeChecked', this.options.onNodeChecked);
		}
	};

    SWSUI.prototype.render = function () {
		this.$element.empty();
        this.buildLayout();
        this.buildNavigation();
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
                        <p><strong>swagger-stats v.0.10.2</strong></p> \
                        <p>Copyright &copy; 2017 <a href="#">SLANATECH</a></p> \
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
        widget:       '<div id="%id%" class="col-md-2">\
                        <div class="swsbox float-e-margins">\
                         <div class="swsbox-title">\
                           <span class="sws-widget-extra label pull-right" style="font-size: 12px;"></span>\
                           <h5 class="sws-widget-title"></h5>\
                         </div>\
                         <span class="swsbox-trend pull-right"><i class="sws-widget-trend fa"></i></span>\
                         <div class="swsbox-content">\
                          <h1 class="sws-widget-value no-margins"></h1>\
                          <small class="sws-widget-subtitle"></small>\
                         </div>\
                        </div>\
                       </div>',
        timelineChart: '<div class="col-lg-12">\
                        <div class="swsbox float-e-margins">\
                        <div class="swsbox-content">\
                        <h4>%title%</h4>\
                        <div>\
                        <canvas id="sws-chart-timeline" height="80px"></canvas>\
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
        this.showSummary(this.tools['#sws-summary']);
        this.showRequests(this.tools['#sws-requests']);
        this.showErrors(this.tools['#sws-errors']);

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

        if(this.apistats != null){
            this.refreshActive();
        }
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
        toolrec = this.tools[this.activeToolId];
        switch(this.activeToolId){
            case '#sws-summary':
                this.showSummary(toolrec);
                break;
            case '#sws-requests':
                this.showRequests(toolrec);
                break;
            case '#sws-errors':
                this.showErrors(toolrec);
                break;
        }
    };

    // Returns percentage string
    SWSUI.prototype.getPctString = function(val,tot) {
        return (((val/tot)*100)).toFixed(2).toString()+'%';
    };

    // Returns percentage
    SWSUI.prototype.getPct = function(val,tot) {
        return (((val/tot)*100)).toFixed(2);
    };


    SWSUI.prototype.widgetProcessors = {
        redIfNonZero: function (wel,val,total,trend){
            wel.find('.sws-widget-extra')
                .removeClass('label-success')
                .removeClass('label-danger')
                .addClass(val>0 ? 'label-danger':'label-success');
            wel.find('.sws-widget-value')
                .removeClass('color-success')
                .removeClass('color-danger')
                .addClass(val>0 ? 'color-danger':'color-success');
        },
        successIfNonZero: function (wel,val,total,trend){
            wel.find('.sws-widget-extra')
                .removeClass('label-success')
                .addClass(val>0 ? 'label-success':'');
            wel.find('.sws-widget-value')
                .removeClass('color-success')
                .addClass(val>0 ? 'color-success':'');
        }
    };

    // TODO parameter - specify column width (lg-2, lg-3 ... etc )

    SWSUI.prototype.createWidget = function(wid) {
        var wdomid = 'sws-w-'+wid;
        return $( this.template.widget.replace('%id%',wdomid) );
    };

    // TODO Columns size
    // if total > 0, %% will be calculated as (value/total)*100 and shown as extra
    SWSUI.prototype.setWidgetValues = function(wid,value,total,trend){

        total = typeof total !== 'undefined' ? total : 0;
        trend = typeof trend !== 'undefined' ? trend : null;

        if( !(wid in this.widgets) ) return;
        var wdef = this.widgets[wid];

        var we = $('#sws-w-'+wid);
        if(we){
            we.find('.sws-widget-title').html(wdef.title);
            we.find('.sws-widget-value').html(value);
            we.find('.sws-widget-subtitle').html(wdef.subtitle);
            if( total > 0 ) {
                we.find('.sws-widget-extra').html(this.getPctString(value,total));
            }
            if(trend !=null){
                we.find('.sws-widget-trend').addClass(trend=='up' ? 'fa-chevron-circle-up' : 'fa-chevron-circle-down');
            }
            // Pass widget & params and let processor update all it needs
            if( ('postProcess' in wdef) && (wdef.postProcess in this.widgetProcessors) ){
                this.widgetProcessors[wdef.postProcess](we,value,total,trend);
            }
        }
    };

    // SWS UI Widgets definitions
    SWSUI.prototype.widgets = {
        summ_wRq  : { title: 'Requests', subtitle:'Total received requests' },
        summ_wRe  : { title: 'Responses', subtitle:'Total sent responses' },
        summ_wHt  : { title: 'Handle Time', subtitle:'Total Handle Time(ms)' },
        summ_wAHt : { title: 'Avg Handle Time', subtitle:'Average Handle Time(ms)' },
        summ_wMHt : { title: 'Max Handle Time', subtitle:'Max Handle Time(ms)' },
        summ_wErr : { title: 'Errors', subtitle:'Total Error Responses', postProcess:'redIfNonZero' },
        summ_wSs  : { title: 'Success', subtitle:'Success Responses', postProcess:'successIfNonZero' },
        summ_wRed : { title: 'Redirect', subtitle:'Redirect Responses' },
        summ_wCe  : { title: 'Client Error', subtitle:'Client Error Responses', postProcess:'redIfNonZero' },
        summ_wSe  : { title: 'Server Error', subtitle:'Server Error Responses', postProcess:'redIfNonZero' }
    };


    SWSUI.prototype.showSummary = function(toolrec) {

        var elemContent = $('#sws-content');
        var elemSummary = elemContent.find('#sws-content-summary');

        if( !elemSummary.length ){

            // Creating DOM for Summary
            elemSummary = $('<div id="sws-content-summary"></div>');
            elemContent.append(elemSummary);

            var elemHdr = $('<div class="page-header"><h1>'+toolrec.title+'</h1></div>');
            elemSummary.append(elemHdr);

            // First row with number boxes
            var elemRow1 = $('<div id="sws-content-summary-row1" class="row">');
            elemSummary.append(elemRow1);
            elemRow1.append(this.createWidget('summ_wRq'));
            elemRow1.append(this.createWidget('summ_wRe'));
            elemRow1.append(this.createWidget('summ_wHt'));
            elemRow1.append(this.createWidget('summ_wAHt'));
            elemRow1.append(this.createWidget('summ_wMHt'));

            var elemRow2 = $('<div id="sws-content-summary-row2" class="row">');
            elemSummary.append(elemRow2);

            elemRow2.append(this.createWidget('summ_wErr'));
            elemRow2.append(this.createWidget('summ_wSs'));
            elemRow2.append(this.createWidget('summ_wRed'));
            elemRow2.append(this.createWidget('summ_wCe'));
            elemRow2.append(this.createWidget('summ_wSe'));

            var elemRow3 = $('<div id="sws-content-summary-row3" class="row">');
            elemSummary.append(elemRow3);

            var timlineChartHTML = this.template.timelineChart
                .replace('%title%','Requests and Responces over last 60 minutes');
            var elemChart = $(timlineChartHTML);
            elemRow3.append(elemChart);
        }

        // Update values, if we have data
        if(this.apistats==null) return;

        var totalerrors = this.apistats.all.client_error+this.apistats.all.server_error;

        this.setWidgetValues('summ_wRq',this.apistats.all.requests);
        this.setWidgetValues('summ_wRe',this.apistats.all.responses);
        this.setWidgetValues('summ_wHt',this.apistats.all.total_time);
        this.setWidgetValues('summ_wAHt',this.apistats.all.avg_time.toFixed(2));
        this.setWidgetValues('summ_wMHt',this.apistats.all.max_time);

        this.setWidgetValues('summ_wErr',totalerrors,this.apistats.all.requests,'down');
        this.setWidgetValues('summ_wSs',this.apistats.all.success,this.apistats.all.requests,'up');
        this.setWidgetValues('summ_wRed',this.apistats.all.redirect,this.apistats.all.requests,'down');
        this.setWidgetValues('summ_wCe',this.apistats.all.client_error,this.apistats.all.requests,'up');
        this.setWidgetValues('summ_wSe',this.apistats.all.server_error,this.apistats.all.requests,'down');

        // TEMP
        this.updateTimelineChart();

    };

    SWSUI.prototype.showRequests = function(toolrec) {

        var elemContent = $('#sws-content');
        var elemRequests = elemContent.find('#sws-content-requests');

        if( !elemRequests.length ) {

            elemRequests = $('<div id="sws-content-requests"></div>');
            elemContent.append(elemRequests);

            var elemHdr = $('<div class="page-header"><h1>'+toolrec.title+'</h1></div>');
            elemRequests.append(elemHdr);

            var elemRow1 = $('<div id="sws-content-requests-row-1" class="row">');
            elemRequests.append(elemRow1);

            var tableHTML = this.template.datatable
                .replace('%id%','sws-table-requestsbymethod')
                .replace('%headers%',this.generateDatatableHeaders(
                    [ ['Method','width:10%'],
                        ['Requests',''],['Responses',''],['Errors',''],
                        ['Success',''],['Redirect',''],['Client Error',''],['Server Error',''],
                        ['Max Time(ms)',''], ['Avg Time(ms)','']
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
                    if( data[3] > 0) $('td', row).eq(3).empty().append('<span class="badge badge-danger">'+data[3]+'</span>');
                    if( data[6] > 0) $('td', row).eq(6).empty().append('<span class="badge badge-danger">'+data[6]+'</span>');
                    if( data[7] > 0) $('td', row).eq(7).empty().append('<span class="badge badge-danger">'+data[7]+'</span>');
                }
            });
        }

        this.updateRequestsByMethodTable();
    };


    SWSUI.prototype.showErrors = function(toolrec) {

        var elemContent = $('#sws-content');
        var elemErrors = elemContent.find('#sws-content-errors');

        if( !elemErrors.length ){

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
        if(this.apistats && this.apistats.last_errors && this.apistats.last_errors.length>0){
            for(var i=0;i<this.apistats.last_errors.length;i++){
                var errorInfo = this.apistats.last_errors[i];
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
                    reqStats.responses,
                    reqStats.client_error+reqStats.server_error,
                    reqStats.success,
                    reqStats.redirect,
                    reqStats.client_error,
                    reqStats.server_error,
                    reqStats.max_time,
                    reqStats.avg_time.toFixed(2)
                ]);
            }
            this.requestsByMethodTable.draw(false);
        }
    };

    SWSUI.prototype.buildTimelineChartData = function() {
        if(!this.apistats) return;

        var timeline_array = [];
        if(this.apistats && this.apistats.timeline) {
            for(var key in this.apistats.timeline){
                var entry = this.apistats.timeline[key];
                entry.tc = parseInt(key);
                var ts = entry.tc*this.apistats.timeline_bucket_duration;
                entry.timelabel = moment(ts).format('hh:mm');
                timeline_array.push(entry);
            }
        }

        // Sort it by timecode ascending
        timeline_array.sort(function(a, b) {
            return a.tc - b.tc;
        });

        this.timelineChartData.labels = [];
        this.timelineChartData.datasets[0].data = [];
        this.timelineChartData.datasets[1].data = [];
        this.timelineChartData.datasets[2].data = [];
        this.timelineChartData.datasets[3].data = [];
        for(var j=0;j<timeline_array.length;j++){
            this.timelineChartData.labels.push(timeline_array[j].timelabel);
            this.timelineChartData.datasets[0].data.push(timeline_array[j].success);
            this.timelineChartData.datasets[1].data.push(timeline_array[j].redirect);
            this.timelineChartData.datasets[2].data.push(timeline_array[j].client_error);
            this.timelineChartData.datasets[3].data.push(timeline_array[j].server_error);
        }
    };

    SWSUI.prototype.updateTimelineChart = function() {
        if(!this.apistats) return;  // nothing to update - dom creation at startup
        this.buildTimelineChartData();
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
