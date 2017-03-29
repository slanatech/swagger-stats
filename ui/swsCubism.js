/*
 * swagger-stats UI - Table plugin
 */

;(function ($, window, document, undefined) {

	/*global jQuery, console*/

	'use strict';

	var pluginName = 'swscubism';

    var pluginTemplates = {
        cubism: '<div id="sws-cubism1"><div>'
    };

	var _default = {};
	_default.settings = {
	};

	var SWSCubism = function (element, options, args) {

		this.$element = $(element);
		this.elementId = element.id;

		this.init( options, args );

		return {
			options: this.options,
			init: $.proxy(this.init, this),
            remove: $.proxy(this.remove, this),
            update: $.proxy(this.update, this)
		};
	};

    function random(name) {
        var value = 0,
            values = [],
            i = 0,
            last;
        return context.metric(function(start, stop, step, callback) {
            start = +start, stop = +stop;
            if (isNaN(last)) last = start;
            while (last < stop) {
                last += step;
                value = Math.max(-10, Math.min(10, value + .8 * Math.random() - .4 + .2 * Math.cos(i += .2)));
                values.push(value);
            }
            callback(null, values = values.slice((start - stop) / step));
        }, name);
    }

    // TEMP
    var context = cubism.context()
        .serverDelay(0)
        .clientDelay(0)
        .step(2000)         // 2 second
        .size(1800);

    var foo = random("foo");
    var bar = random("bar");
    var opa = random("AAAA");


    SWSCubism.prototype.init = function ( options, args ) {
		this.options = $.extend({}, _default.settings, options);

		this.dataTableId = this.options.id;
        var that = this;
        $(window).resize(function(){
            var elem = $('#sws-cubism1');
            console.log('Resize called: new width: ' + elem.width());
            // On resize, just re-render
            // TODO check if width has actually changed
            that.render();
        });

        this.destroy();
        this.render();
	};

    SWSCubism.prototype.remove = function () {
		this.destroy();
		$.removeData(this, pluginName);
	};

    SWSCubism.prototype.update = function (data) {
        // TODO
    };

    SWSCubism.prototype.destroy = function () {
        this.$element.empty();
	};

    SWSCubism.prototype.random = function(name) {
        var value = 0,
            values = [],
            i = 0,
            last;
        return this.context.metric(function(start, stop, step, callback) {
            start = +start, stop = +stop;
            if (isNaN(last)) last = start;
            while (last < stop) {
                last += step;
                value = Math.max(-10, Math.min(10, value + .8 * Math.random() - .4 + .2 * Math.cos(i += .2)));
                values.push(value);
            }
            callback(null, values = values.slice((start - stop) / step));
        }, name);
    };


    SWSCubism.prototype.render = function () {

		this.$element.empty();
        var elemHTML = pluginTemplates.cubism;

        var elemCubism= $(elemHTML);
        this.$element.append(elemCubism);

        // Calculate based on element width !!!
        console.log('Rendering Cubism based on width:' + this.$element.width() );

        var elemWidth = Math.floor(this.$element.width());

        // What is step size ( in milleseconds ) to make size=elemWidth represent 1 hour ?
        var stepValue = Math.floor(elemWidth*(1000/3660));

        // TODO calculate data based on step size and get from the same 60-min timeline
        // means the same value will be repeated multiple times for several steps,
        // taken from the same time bucket

        // TODO Or, size it based on max avaiable width ( i.e. 4+ hours)  and keep updating, collecting history
        // ok to lose if refreshed

        this.context = cubism.context()
            .serverDelay(0)
            .clientDelay(0)
            .step(3000)
            .size(3600/3);

        this.foo = this.random("foo");
        this.bar = this.random("bar");
        this.opa = this.random("AAAA");

        var that = this;

        //context =
        d3.select("#sws-cubism1").call(function(div) {

            div.append("div")
                .attr("class", "axis")
                .call(that.context.axis().orient("top"));

            div.selectAll(".horizon")
                .data([foo, bar, opa])
                .enter().append("div")
                .attr("class", "horizon")
                .call(that.context.horizon().extent([-20, 20]));

            div.append("div")
                .attr("class", "rule")
                .call(that.context.rule());

        });


	};

	// Prevent against multiple instantiations, handle updates and method calls
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
				//$.data(this, pluginName, new SWSTable(this, $.extend(true, {}, options)));
                // [sv2] Do not deep copy options array - pass as is, so table data can be updated elsewhere
                $.data(this, pluginName, new SWSCubism( this, options, args ));
			}
		});
		return result || this;
	};

})(jQuery, window, document);
