/*
 * swagger-stats UI - Widget plugin
 */

;(function ($, window, document, undefined) {

	/*global jQuery, console*/

	'use strict';

	var pluginName = 'swswidget';


    var pluginTemplates = {
        widget:       '<div class="swsbox float-e-margins">\
                         <div class="swsbox-title">\
                           <span class="sws-widget-extra label pull-right"></span>\
                           <h5 class="sws-widget-title"></h5>\
                         </div>\
                         <div class="swsbox-content" style="display: block;">\
                            <div class="swsbox-trend"><i class="sws-widget-trend fa"></i></div>\
                            <div class="swsbox-values">\
                                <h1 class="sws-widget-value no-margins"></h1>\
                                <small class="sws-widget-subtitle"></small>\
                            </div>\
                         </div>\
                       </div>'
    };

	var _default = {};

	_default.settings = {
        id: "wid",
	    title: "WIDGET",
        subtitle: "Subtitle",
        style: "default"
	};

	var SWSWidget = function (element, options) {

		this.$element = $(element);
		this.elementId = element.id;

		this.init(options);

		return {

			// Options (public access)
			options: this.options,

			// Initialize / destroy methods
			init: $.proxy(this.init, this),
			//remove: $.proxy(this.remove, this),
            setvalue: $.proxy(this.setvalue, this)
		};
	};

    SWSWidget.prototype.init = function (options) {
		this.options = $.extend({}, _default.settings, options);
        this.destroy();
		this.subscribeEvents();
        this.render();
	};

    /*
    SWSWidget.prototype.remove = function () {
		this.destroy();
		$.removeData(this, pluginName);
	};
    */

    SWSWidget.prototype.destroy = function () {
        this.$element.empty();
		// Switch off events
		this.unsubscribeEvents();
	};

    // Returns percentage string
    SWSWidget.prototype.getPctString = function(val,tot) {
        return (((val/tot)*100)).toFixed(2).toString()+'%';
    };

    /*
    SWSWidget.prototype.getPct = function(val,tot) {
        return (((val/tot)*100)).toFixed(2);
    };
    */

    // if total > 0, %% will be calculated as (value/total)*100 and shown as extra
    // data = {value:X,total:Y,trend:"up"|"down",...}
    SWSWidget.prototype.setvalue = function (data) {

        var value = typeof data.value !== 'undefined' ? data.value : 0;
        var total = typeof data.total !== 'undefined' ? data.total : 0;
        var trend = typeof data.trend !== 'undefined' ? data.trend : null;
        var extra = typeof data.extra !== 'undefined' ? data.extra : null;
        var customtrend = typeof data.customtrend === 'function' ? data.customtrend : null;    // Custom trend function

        this.$element.find('.sws-widget-value').html(value);

        if( 'title' in data ) this.$element.find('.sws-widget-title').html(data.title);
        if( 'subtitle' in data ) this.$element.find('.sws-widget-subtitle').html(data.subtitle);

        if( total > 0 ) {
            this.$element.find('.sws-widget-extra').html(this.getPctString(value,total));
        }else if( extra != null ){
            this.$element.find('.sws-widget-extra').html(extra);
        }

        var elemTrend = this.$element.find('.swsbox-trend');
        //elemTrend.removeClass('fa-chevron-circle-up').removeClass('fa-chevron-circle-down');
        elemTrend.empty();
        if((trend!=null) && (trend!='')){
            elemTrend.append($('<i class="fa">').addClass(trend=='up' ? 'fa-chevron-circle-up' : 'fa-chevron-circle-down'));
            //elemTrend.addClass(trend=='up' ? 'fa-chevron-circle-up' : 'fa-chevron-circle-down');
        }

        if( customtrend != null ){
            customtrend(elemTrend);
            //elemTrend.append($('<div class="swsbox-trend-container"><span class="pie">15,85</span></div>'));
            //elemTrend.find('.pie').peity("pie",{ radius:30 });
        }

        // Pass widget & params and let processor update all it needs
        if( ('postProcess' in this.options) && (this.options.postProcess in this.widgetProcessors) ){
            this.widgetProcessors[this.options.postProcess](this.$element,value,total,trend);
        }
    };

    SWSWidget.prototype.widgetProcessors = {
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
        /*
        warningIfNonZero: function (wel,val,total,trend){
            wel.find('.sws-widget-extra')
                .removeClass('label-success')
                .addClass(val>0 ? 'label-warning':'');
            wel.find('.sws-widget-value')
                .removeClass('color-success')
                .addClass(val>0 ? 'color-warning':'');
        },
        p3IfNonZero: function (wel,val,total,trend){
            wel.find('.sws-widget-extra')
                .removeClass('label-success')
                .addClass(val>0 ? 'label-warning':'');
            wel.find('.sws-widget-value')
                .removeClass('color-success')
                .addClass(val>0 ? 'color-palette3':'');
        }
        */
    };


    SWSWidget.prototype.unsubscribeEvents = function () {
        // TODO Define events
	};

    SWSWidget.prototype.subscribeEvents = function () {
        // TODO Define events - consider click and move to another tab ? I.e. Click on errors widget
	};


    SWSWidget.prototype.render = function () {
		this.$element.empty();
        var elemWidget = $(pluginTemplates.widget);
        elemWidget.find('.sws-widget-title').html(this.options.title);
        elemWidget.find('.sws-widget-subtitle').html(this.options.subtitle);
        // Apply additional styles, if specified
        switch( this.options.style ){
            case "default":
                break;
            case "infobox":
                elemWidget.find('.sws-widget-title').addClass('label-jumbo').addClass('no-margins');
                elemWidget.find('.swsbox-title').addClass('alert-info').addClass('swsbox-extra-padding');
                elemWidget.find('.swsbox-content').addClass('alert-info');
                elemWidget.find('.sws-widget-extra')
                    .removeClass('label')
                    .addClass('label-jumbo')
                    .addClass('cursor-pointer')
                    .append($('<i class="swsbox-collapse fa fa-chevron-up"></i>'));
                elemWidget.addClass('cursor-pointer').click( $.proxy(this.expandOrCollapse, this));
                break;
        }
        this.$element.append(elemWidget);
	};

    SWSWidget.prototype.expandOrCollapse = function () {
        var content = this.$element.find('.swsbox-content');
        var excoll = this.$element.find('.swsbox-collapse');
        if( excoll.hasClass('fa-chevron-up')){
            excoll.removeClass('fa-chevron-up').addClass('fa-chevron-down');
            content.hide();
        }else{
            excoll.removeClass('fa-chevron-down').addClass('fa-chevron-up');
            content.show();
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
				$.data(this, pluginName, new SWSWidget(this, $.extend(true, {}, options)));
			}
		});

		return result || this;
	};

})(jQuery, window, document);
