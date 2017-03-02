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

        this.tools = {
            "#sws-summary" : {id:'sws-summary', title:'Summary', icon:'fa-line-chart', handler: this.showSummary },
            "#sws-requests": {id:'sws-requests', title:'Requests', icon:'fa-exchange', handler: this.showRequests},
            "#sws-errors": {id:'sws-errors', title:'Last Errors', icon:'fa-exclamation-circle', handler: this.showErrors}
        };

		this.destroy();
		this.subscribeEvents();

        console.log("Refresh: "+this.options.refreshInterval);
        setInterval( this.refreshApiStats, this.options.refreshInterval*5000, this );
        this.refreshApiStats(this);


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

		//.append(this.$wrapper.empty());

        this.buildLayout();
        this.buildNavigation();

        //this.$element.append(nav);

        // Build sidebar
		//this.buildTree(this.tree, 0);
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
                </footer>'
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
        if( this.activeToolId in this.tools){
            this.tools[this.activeToolId].handler(this);
        }
    };

    SWSUI.prototype.showSummary = function(swsui) {

        // Clear content
        if(null!=swsui.timelineChart){
            swsui.timelineChart.destroy();
            swsui.timelineChart = null;
        }

        var elemContent = $('#sws-content');
        elemContent.empty();

        var elemHdr = $('<div class="page-header"><h1>'+this.title+'</h1></div>');
        elemContent.append(elemHdr);

        // First row with number boxes
        var elemRow1 = $('<div id="sws-content-summary-row1" class="row">');
        elemContent.append(elemRow1);

        elemRow1.append(swsui.generateNumberWidget('Requests',swsui.apistats.all.requests,'Total received requests'));
        elemRow1.append(swsui.generateNumberWidget('Responses',swsui.apistats.all.responses,'Total sent responses'));
        elemRow1.append(swsui.generateNumberWidget('Handle Time',swsui.apistats.all.total_time,'Total Handle Time(ms)'));
        elemRow1.append(swsui.generateNumberWidget('Avg Handle Time',swsui.apistats.all.avg_time,'Average Handle Time(ms)'));
        elemRow1.append(swsui.generateNumberWidget('Max Handle Time',swsui.apistats.all.max_time,'Maximum Handle Time(ms)'));
        elemRow1.append(swsui.generateNumberWidget('Active',(swsui.apistats.all.requests-swsui.apistats.all.responses),'Currently active requests'));

        var elemRow2 = $('<div id="sws-content-summary-row2" class="row">');
        elemContent.append(elemRow2);
        // TODO Percentage helper
        var errval = swsui.apistats.all.client_error+swsui.apistats.all.server_error;
        var errpct = ((errval/swsui.apistats.all.requests)*100).toString()+'%';
        elemRow2.append(swsui.generateNumberWidget('Errors',errval,'Total Error Responses',errpct));
        elemRow2.append(swsui.generateNumberWidget('Success',swsui.apistats.all.success,'Success Responses'));
        elemRow2.append(swsui.generateNumberWidget('Redirect',swsui.apistats.all.redirect,'Redirect Responses'));
        elemRow2.append(swsui.generateNumberWidget('Client Error',swsui.apistats.all.client_error,'Client Error Responses'));
        elemRow2.append(swsui.generateNumberWidget('Server Error',swsui.apistats.all.server_error,'Server Error Responses'));

        // Timeline
        var elemRow3 = $('<div id="sws-content-summary-row3" class="row">');
        elemContent.append(elemRow3);
        swsui.generateTimeline(elemRow3);

        // TODO Add updateSummary and call from here - just to set values
    };

    SWSUI.prototype.showRequests = function(swsui) {
        // Clear content
        var elemContent = $('#sws-content');
        elemContent.empty();

        var elemHdr = $('<div class="page-header"><h1>'+this.title+'</h1></div>');
        elemContent.append(elemHdr);
    };


    SWSUI.prototype.showErrors = function(swsui) {
        // Clear content
        var elemContent = $('#sws-content');
        elemContent.empty();

        var elemHdr = $('<div class="page-header"><h1>'+this.title+'</h1></div>');
        elemContent.append(elemHdr);

        var elemRow1 = $('<div id="sws-content-errors-row-1" class="row">');
        elemContent.append(elemRow1);
        swsui.generateErrorsTable(elemRow1);
    };


    // TODO parameter - specify column width (lg-2, lg-3 ... etc )
    // TODO parameter - color rule ( RED if > 0), always green, etc.
    // TODO Percentage helper
    // TODO Color selector for Extra - red / green
    SWSUI.prototype.generateNumberWidget = function(title, value, subtitle, extra) {

        extra = typeof extra !== 'undefined' ? extra : null;
        subtitle = typeof subtitle !== 'undefined' ? subtitle : null;

        var widgetHTML = '<div class="col-md-2">';
        widgetHTML += '<div class="swsbox float-e-margins">';
        widgetHTML += '<div class="swsbox-title">';
        if(extra!=null) {
            widgetHTML += '<span class="stat-percent label label-success pull-right" style="font-size: 12px;">'+extra+'</span>'; // <i class="fa fa-bolt"></i>
        }
        widgetHTML += '<h5>'+title+'</h5>';
        widgetHTML += '</div>';
        widgetHTML += '<div class="swsbox-content">';
        widgetHTML += '<h1 class="no-margins" style="color: green;">'+value+'</h1>';
        if(subtitle!=null) {
            widgetHTML += '<small>' + subtitle + '</small>';
        }
        widgetHTML += '</div>';
        widgetHTML += '</div>';
        widgetHTML += '</div>';
        var elemWidget = $(widgetHTML);
        return elemWidget;
    };


    SWSUI.prototype.generateErrorsTable = function(parentElem) {
        var tableHTML = '<div class="col-lg-12">';
        tableHTML += '<div class="swsbox float-e-margins">';
        tableHTML += '<div class="swsbox-content">';
        tableHTML += '<div class="table-responsive">';
        tableHTML += '<table class="table table-striped table-bordered table-condensed table-hover sws-table-errors" >';
        tableHTML += '<thead>';
        tableHTML += '<tr>';
        tableHTML += '<th style="width:20%">Time</th>';
        tableHTML += '<th>Method</th>';
        tableHTML += '<th style="width:30%">URL</th>';
        tableHTML += '<th>Code</th>';
        tableHTML += '<th>Class</th>';
        tableHTML += '<th>Duration</th>';
        tableHTML += '<th style="width: 30%">Message</th>';
        tableHTML += '</tr>';
        tableHTML += '</thead>';
        tableHTML += '<tbody>';
        tableHTML += '</tbody>';
        tableHTML += '</table>';
        tableHTML += '</div></div></div></div>';
        var elemTable = $(tableHTML);
        parentElem.append(elemTable);
        var errorsTable = $('.sws-table-errors').DataTable({
            pageLength: 25,
            responsive: true,
            dom: '<"html5buttons"B>lTfgitp',
            buttons: [
                {extend: 'copy'},
                {extend: 'csv'},
                {extend: 'excel', title: 'ExampleFile'},
                {extend: 'pdf', title: 'ExampleFile'}
            ],
            "order": [[ 0, "desc" ]],
            "createdRow": function ( row, data, index ) {
               $('td', row).eq(1).empty().append('<span class="badge badge-info">'+data[1]+'</span>');
               $('td', row).eq(3).empty().append('<strong>'+data[3]+'</strong>');
            }

        });

        // Show data
        if(this.apistats && this.apistats.last_errors && this.apistats.last_errors.length>0){
            for(var i=0;i<this.apistats.last_errors.length;i++){
                var errorInfo = this.apistats.last_errors[i];
                errorsTable.row.add([
                    moment(errorInfo.startts).format(),
                    errorInfo.method,
                    errorInfo.url,
                    errorInfo.code,
                    errorInfo.codeclass,
                    errorInfo.duration,
                    errorInfo.message
                ]).draw( false );
            }
        }
    };


    SWSUI.prototype.generateTimeline = function(parentElem) {
        var chartHTML = '<div class="col-lg-12">';
        chartHTML += '<div class="swsbox float-e-margins">';
        chartHTML += '<div class="swsbox-content">';
        chartHTML += '<h4>Requests and Responces over last 60 minutes</h4>';
        chartHTML += '<div>';
        chartHTML += '<canvas id="sws-chart-timeline" height="60"></canvas>';
        chartHTML += '</div>';
        chartHTML += '</div>';
        chartHTML += '</div>';
        chartHTML += '</div>';
        var elemChart = $(chartHTML);
        parentElem.append(elemChart);

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

        // Sort it by timecode ascending (???)
        timeline_array.sort(function(a, b) {
            return a.tc - b.tc;
        });


        var barData = {
            labels: [],
            datasets: [
                {
                    label: "Success",
                    backgroundColor: '#1c84c6',
                    data: []
                },
                {
                    label: "Redirect",
                    backgroundColor: '#d2d2d2',
                    data: []
                },
                {
                    label: "Client Error",
                    backgroundColor: '#f8ac59',
                    data: []
                },
                {
                    label: "Server Error",
                    backgroundColor: '#ed5565',
                    data: []
                }
            ]
        };

        for(var j=0;j<timeline_array.length;j++){
            barData.labels.push(timeline_array[j].timelabel);
            barData.datasets[0].data.push(timeline_array[j].success);
            barData.datasets[1].data.push(timeline_array[j].redirect);
            barData.datasets[2].data.push(timeline_array[j].client_error);
            barData.datasets[3].data.push(timeline_array[j].server_error);
        }


        // Data
        /*
        var barData = {
            labels: ["00:01", "00:02", "00:03", "00:04", "00:05", "00:06", "00:07","00:08","00:09","00:10","00:01", "00:02", "00:03", "00:04", "00:05", "00:06", "00:07","00:08","00:09","00:10","00:01", "00:02", "00:03", "00:04", "00:05", "00:06", "00:07","00:08","00:09","00:10","00:01", "00:02", "00:03", "00:04", "00:05", "00:06", "00:07","00:08","00:09","00:10","00:01", "00:02", "00:03", "00:04", "00:05", "00:06", "00:07","00:08","00:09","00:10","00:01", "00:02", "00:03", "00:04", "00:05", "00:06", "00:07","00:08","00:09","00:10"],
            datasets: [
                {
                    label: "Success",
                    backgroundColor: 'rgba(220, 220, 220, 0.5)',
                    data: [65, 59, 80, 81, 56, 55, 40, 120,78,34,65, 59, 80, 81, 56, 55, 40, 120,78,34,65, 59, 80, 81, 56, 55, 40, 120,78,34,65, 59, 80, 81, 56, 55, 40, 120,78,34,65, 59, 80, 81, 56, 55, 40, 120,78,34,65, 59, 80, 81, 56, 55, 40, 120,78,34,65, 59, 80, 81, 56, 55, 40, 120,78,34]
                },
                {
                    label: "Client Error",
                    backgroundColor: 'rgba(26,179,148,0.5)',
                    borderColor: "rgba(26,179,148,0.7)",
                    pointBackgroundColor: "rgba(26,179,148,1)",
                    data: [28, 48, 40, 19, 86, 27, 90, 11,90,45,28, 48, 40, 19, 86, 27, 90, 11,90,45,28, 48, 40, 19, 86, 27, 90, 11,90,45,28,48, 40, 19, 86, 27, 90, 11,90,45,28, 48, 40, 19, 86, 27, 90, 11,90,45,28, 48, 40, 19, 86, 27, 90, 11,90,45]
                }
            ]
        };
        */
        var barOptions = {
            responsive: true,
            scales: {
                xAxes: [{
                    stacked: true,
                }],
                yAxes: [{
                    stacked: true
                }]
            }
        };

        var ctx2 = document.getElementById("sws-chart-timeline").getContext("2d");
        this.timelineChart = new Chart(ctx2, {type: 'bar', data: barData, options:barOptions});

    };

        // Sample TODO remove
    SWSUI.prototype.buildTree = function (nodes, level) {

		if (!nodes) return;
		level += 1;

		var _this = this;
		$.each(nodes, function addNodes(id, node) {

			var treeItem = $(_this.template.item)
				.addClass('node-' + _this.elementId)
				.addClass(node.state.checked ? 'node-checked' : '')
				.addClass(node.state.disabled ? 'node-disabled': '')
				.addClass(node.state.selected ? 'node-selected' : '')
				.addClass(node.searchResult ? 'search-result' : '')
				.attr('data-nodeid', node.nodeId)
				.attr('style', _this.buildStyleOverride(node));

			// Add indent/spacer to mimic sidebar structure
			for (var i = 0; i < (level - 1); i++) {
				treeItem.append(_this.template.indent);
			}

			// Add expand, collapse or empty spacer icons
			var classList = [];
			if (node.nodes) {
				classList.push('expand-icon');
				if (node.state.expanded) {
					classList.push(_this.options.collapseIcon);
				}
				else {
					classList.push(_this.options.expandIcon);
				}
			}
			else {
				classList.push(_this.options.emptyIcon);
			}

			treeItem
				.append($(_this.template.icon)
					.addClass(classList.join(' '))
				);


			// Add node icon
			if (_this.options.showIcon) {

				var classList = ['node-icon'];

				classList.push(node.icon || _this.options.nodeIcon);
				if (node.state.selected) {
					classList.pop();
					classList.push(node.selectedIcon || _this.options.selectedIcon ||
									node.icon || _this.options.nodeIcon);
				}

				treeItem
					.append($(_this.template.icon)
						.addClass(classList.join(' '))
					);
			}

			// Add check / unchecked icon
			if (_this.options.showCheckbox) {

				var classList = ['check-icon'];
				if (node.state.checked) {
					classList.push(_this.options.checkedIcon);
				}
				else {
					classList.push(_this.options.uncheckedIcon);
				}

				treeItem
					.append($(_this.template.icon)
						.addClass(classList.join(' '))
					);
			}

			// Add text
			if (_this.options.enableLinks) {
				// Add hyperlink
				treeItem
					.append($(_this.template.link)
						.attr('href', node.href)
						.append(node.text)
					);
			}
			else {
				// otherwise just text
				treeItem
					.append(node.text);
			}

			// Add tags as badges
			if (_this.options.showTags && node.tags) {
				$.each(node.tags, function addTag(id, tag) {
					treeItem
						.append($(_this.template.badge)
							.append(tag)
						);
				});
			}

			// Add item to the sidebar
			_this.$wrapper.append(treeItem);

			// Recursively add child ndoes
			if (node.nodes && node.state.expanded && !node.state.disabled) {
				return _this.buildTree(node.nodes, level);
			}
		});
	};


	var logError = function (message) {
		if (window.console) {
			window.console.error(message);
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
