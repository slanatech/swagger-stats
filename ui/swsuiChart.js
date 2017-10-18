/*
 * swagger-stats UI - Chart plugin
 */

;(function ($, window, document, undefined) {

	/*global jQuery, console*/

	'use strict';

	var pluginName = 'swschart';

    var pluginTemplates = {
        chart: '<div class="swsbox float-e-margins">\
                <div class="swsbox-content">\
                <h5></h5>\
                <div>\
                <canvas height="10px"></canvas>\
                </div></div></div>'
    };

	var _default = {};

	_default.settings = {
	    title: "Chart",
        height: "100px",
        type: 'doughnut'
	};

	var SWSChart = function (element, options, args) {
		this.$element = $(element);
		this.elementId = element.id;
        this.chart = null;
        this.chartdata = { labels: [], datasets: [] };
        this.chartoptions = { responsive: true };
		this.init(options, args);
		return {
			// Options (public access)
			options: this.options,
			// Initialize / destroy methods
			init: $.proxy(this.init, this),
            update: $.proxy(this.update, this),
            getchartdata: $.proxy(this.getchartdata, this)
		};
	};

    SWSChart.prototype.init = function (options, args ) {
        this.options = $.extend({}, _default.settings, options );
		if( args && 'chartdata' in args ) {
            this.chartdata = args.chartdata;
        }
        if( args  && 'chartoptions' in args  ) {
            this.chartoptions = args.chartoptions;
        }
        this.destroy();
		this.subscribeEvents();
        this.render();
	};

    SWSChart.prototype.destroy = function () {
        this.$element.empty();
		// Switch off events
		this.unsubscribeEvents();
	};

    SWSChart.prototype.update = function (data) {
        if( this.chart == null ) {
            // Lazy chart creation to ensure animation on first draw
            var ctx = this.$element.find('canvas')[0].getContext("2d");
            this.chart = new Chart(ctx, {
                type: this.options.type,
                data: this.chartdata,
                options: this.chartoptions
            });
        }
        this.chart.update();
    };

    SWSChart.prototype.getchartdata = function (data) {
        return this.chartdata;
    };

    SWSChart.prototype.unsubscribeEvents = function () {
        // TODO Define events
	};

    SWSChart.prototype.subscribeEvents = function () {
        // TODO Define events - consider click and apply filter ?
	};

    SWSChart.prototype.render = function () {
		this.$element.empty();
        var elemChart = $(pluginTemplates.chart);
        if(('title' in this.options) && (this.options.title!=='')) {
            elemChart.find('h5').html(this.options.title);
        }else{
            elemChart.find('h5').remove();
        }
        elemChart.find('canvas').attr('height',this.options.height);
        this.$element.append(elemChart);
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
				//$.data(this, pluginName, new SWSChart(this, $.extend(true, {}, options)));
                // [sv2] Do not deep copy options array - pass as is, so chart data can be update elsewhere
                $.data(this, pluginName, new SWSChart(this, options, args ));
			}
		});

		return result || this;
	};

})(jQuery, window, document);
