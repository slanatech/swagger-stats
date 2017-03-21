/*
 * swagger-stats UI - Tables plugin
 */

;(function ($, window, document, undefined) {

	/*global jQuery, console*/

	'use strict';

	var pluginName = 'swstables';


	/*
	*    var pluginTemplates = {
     datatable: '<div class="swsbox float-e-margins"><div class="swsbox-content">\
     <div class="table-responsive">\
     <table id="%id%" class="table table-striped table-bordered table-condensed table-hover" >\
     </table>\
     </div></div></div>',
     tableheader: '<th style="%style%">%title%</th>',
     };
     */

    var pluginTemplates = {
        datatable: '<div class="swsbox float-e-margins"><div class="swsbox-content">\
                    <div class="table-responsive">\
                    <table id="%id%" class="table table-striped table-bordered table-condensed table-hover" width="100%">\
                    </table>\
                    </div></div></div>',
        tableheader: '<th style="%style%">%title%</th>',
    };


	var _default = {};

	_default.settings = {
		type: 'api',            // API table is default one
        id: 'sws-table-api'     // Default id of API table
	};

	var SWSTables = function (element, options) {

		this.$element = $(element);
		this.elementId = element.id;

        this.dataTableId = null;
        this.dataTable = null;

		this.init(options);

		return {

			// Options (public access)
			options: this.options,

			// Initialize / destroy methods
			init: $.proxy(this.init, this),
            update: $.proxy(this.update, this),
			remove: $.proxy(this.remove, this)
		};
	};

    SWSTables.prototype.init = function (options) {
		this.options = $.extend({}, _default.settings, options);
        this.dataTableId = this.options.id;

        this.destroy();
		this.subscribeEvents();

        this.render();
	};

    SWSTables.prototype.update = function (data) {
        this.updateAPITable(data);
    };

    SWSTables.prototype.remove = function () {
		this.destroy();
		$.removeData(this, pluginName);
	};

    SWSTables.prototype.destroy = function () {
        this.$element.empty();
		// Switch off events
		this.unsubscribeEvents();
	};

    SWSTables.prototype.unsubscribeEvents = function () {
        // TODO Define events
		this.$element.off('nodeChecked');
	};

    SWSTables.prototype.subscribeEvents = function () {
        // TODO Define events
	    this.unsubscribeEvents();
		if (typeof (this.options.onNodeChecked) === 'function') {
			this.$element.on('nodeChecked', this.options.onNodeChecked);
		}
	};

    //headersDefs: array of pairs [ [<Title>,<style>], ... ]
    SWSTables.prototype.generateDatatableHeaders = function(headersDefs) {
        var that = this;
        var headers = '';
        headersDefs.forEach(function(v,i,a){
            headers += pluginTemplates.tableheader.replace('%title%',v[0]).replace('%style%',v[1]);
        });
        return headers;
    };

    SWSTables.prototype.render = function () {
		this.$element.empty();

        var tableHTML = pluginTemplates.datatable
            .replace('%id%',this.dataTableId);

        var elemTable = $(tableHTML);
        this.$element.append(elemTable);
        this.dataTable = $('#'+this.dataTableId).DataTable({
            pageLength: 25,
            columns: [
                {title:'', width:'0%', searchable:false, orderable:false },
                {title:'Path', width:'20%'},
                {title:'Method'},
                {title:'Swagger'},
                {title:'Deprecated'},
                {title:'Requests'},
                {title:'Errors'},
                {title:'Success'},
                {title:'Redirect'},
                {title:'Client Error'},
                {title:'Server Error'},
                {title:'Max Time(ms)'},
                {title:'Avg Time(ms)'},
                {title:'Avg Req Payload'},
                {title:'Avg Res Payload'},
                {title:'OperationId', visible:false},
                {title:'Summary', visible:false},
                {title:'Description', visible:false},
                {title:'Tags'}
            ],
            responsive: true,
            dom: '<"html5buttons"B>lTfgitp',
            buttons: ['copy','csv','colvis'],
            "order": [[ 5, "desc" ]],
            "createdRow": function ( row, data, index ) {
                $('td', row).eq(0).empty().addClass('sws-row-expand text-center cursor-pointer').append('<i class="fa fa-caret-right">');
                $('td', row).eq(1).empty().append('<strong>'+data[1]+'</strong>');
                $('td', row).eq(2).empty().append('<span class="badge badge-info">'+data[2]+'</span>');
                if( (data[4]=='Yes') && (data[5] > 0) ) $('td', row).eq(5).empty().append('<span class="badge badge-warning">'+data[5]+'</span>');
                if( data[6] > 0) $('td', row).eq(6).empty().append('<span class="badge badge-danger">'+data[6]+'</span>');
                if( data[9] > 0) $('td', row).eq(9).empty().append('<span class="badge badge-danger">'+data[9]+'</span>');
                if( data[10] > 0) $('td', row).eq(10).empty().append('<span class="badge badge-danger">'+data[10]+'</span>');
            }
        });

        // Expand
        // TODO Add "enable expand" as parameter
        // Add event listener for opening and closing details
        var that = this;
        $('#'+this.dataTableId).on('click', 'td.sws-row-expand', function () {
            var tr = $(this).closest('tr');
            var tdi = $(this).find('i');
            var row = that.dataTable.row( tr );
            if ( row.child.isShown() ) {
                row.child.hide();
                tdi.removeClass('fa-caret-down');
                tdi.addClass('fa-caret-right');
            }
            else {
                // Prepare details view
                var alertClass = 'alert-warning';
                var detailsContent = '';
                if(row.data()[4] == 'Yes'){
                    detailsContent = '<strong>DEPRECATED</strong><br/>';
                    alertClass = 'alert-danger';
                }
                detailsContent += row.data()[15] != '' ? '<strong>operationId: </strong>'+ row.data()[15] +'<br/>' : '';
                detailsContent += row.data()[16] != '' ? '<strong>Summary: </strong>'+ row.data()[16] +'<br/>' : '';
                detailsContent += row.data()[17] != '' ? '<strong>Description: </strong>'+ row.data()[17] +'<br/>': '';
                detailsContent += row.data()[18] != '' ? '<strong>Tags: </strong>'+ row.data()[18] : '';
                row.child( '<div class="alert '+alertClass+'">'+detailsContent+'</div>' ).show();
                tdi.removeClass('fa-caret-right');
                tdi.addClass('fa-caret-down');
            }
        } );


	};


    SWSTables.prototype.updateAPITable = function(coreStats) {

        if( this.dataTable == null ) return;
        this.dataTable.clear();

        // Show data
        if(coreStats && coreStats.api){
            for( var path in coreStats.api){
                var apiPath = coreStats.api[path];
                for( var method in apiPath) {
                    var apiPathMethod = apiPath[method];
                    this.dataTable.row.add([
                        '',
                        path,
                        method,
                        ('swagger' in apiPathMethod ? (apiPathMethod.swagger ? 'Yes':'No'): 'No'),
                        ('deprecated' in apiPathMethod ? (apiPathMethod.deprecated ? 'Yes':''): ''),
                        apiPathMethod.stats.requests,
                        apiPathMethod.stats.client_error + apiPathMethod.stats.server_error,
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
                    ]);

                }
            }
            this.dataTable.draw(false);
        }
    };

    SWSTables.prototype.updateRequestsByMethodTable = function(coreStats) {

        if( this.dataTable == null ) return;
        this.dataTable.clear();

        // Show data
        if(coreStats && coreStats.method){
            for( var method in coreStats.method){
                var reqStats = coreStats.method[method];
                this.dataTable.row.add([
                    method,
                    reqStats.requests,
                    reqStats.responses,
                    reqStats.client_error+reqStats.server_error,
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
            this.dataTable.draw(false);
        }
    };



    SWSTables.prototype.updateErrorsTable = function(coreStats) {

        if( this.dataTable == null ) return;

        // Show data
        this.dataTable.clear();
        if(coreStats && coreStats.last_errors && coreStats.last_errors.length>0){
            for(var i=0;i<coreStats.last_errors.length;i++){
                var errorInfo = coreStats.last_errors[i];
                this.dataTable.row.add([
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
            this.dataTable.draw(false);
        }
    };

	// Prevent against multiple instantiations,
	// handle updates and method calls
	$.fn[pluginName] = function (options, args) {

		var result;

		this.each(function () {
			var _this = $.data(this, pluginName);
			if (typeof options === 'string') {
				if (!_this) {
					console.log('Not initialized, can not call method : ' + options);
				}
				else if (!$.isFunction(_this[options]) || options.charAt(0) === '_') {
                    console.log('No such method : ' + options);
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
				$.data(this, pluginName, new SWSTables(this, $.extend(true, {}, options)));
			}
		});

		return result || this;
	};

})(jQuery, window, document);
