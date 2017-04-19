/*
 * swagger-stats UI - Table plugin
 */

;(function ($, window, document, undefined) {

	/*global jQuery, console*/

	'use strict';

	var pluginName = 'swsapiopsel';

    var pluginTemplates = {
        select:    '<div class="sws-apiopsel side-by-side clearfix">\
                      <select data-placeholder="Select API Operation" class="sws-chosen-select">\
                      </select>\
                    </div>'
    };

	var _default = {};
	_default.settings = {
    };

	var SWSApiOpSel = function (element, options, args) {

		this.$element = $(element);
		this.elementId = element.id;

		this.init( options, args );

		return {
			options: this.options,
			init: $.proxy(this.init, this),
            remove: $.proxy(this.remove, this),
            update: $.proxy(this.update, this),
            getvalue: $.proxy(this.getvalue, this),
            setvalue: $.proxy(this.setvalue, this)
		};
	};

    SWSApiOpSel.prototype.init = function ( options, args ) {
        this.options = $.extend({}, _default.settings, options);
        this.destroy();
        this.render();
	};

    SWSApiOpSel.prototype.remove = function () {
		this.destroy();
		$.removeData(this, pluginName);
	};

    SWSApiOpSel.prototype.clear = function () {
        // Noop //
    };

    SWSApiOpSel.prototype.update = function (data) {
        // data - full stats data which should have apidefs and apistats
        if( !('apistats' in data) ) return;

        // path == group
        // OP path (tags) == option
        var elemSelect = this.$element.find(".sws-chosen-select");
        elemSelect.empty();
        for(var path in data.apistats){
            var apiPath = data.apistats[path];
            var elemOptGroup = $('<optgroup label="'+path+'">');
            for( var method in apiPath) {
                var apiOpStats = apiPath[method];
                var apiOpDef = {swagger:false,deprecated:false,operationId:'',summary:'',description:''};
                if( ('apidefs' in data) && (path in data.apidefs) && (method in data.apidefs[path]) ){
                    apiOpDef = data.apidefs[path][method];
                }

                var optvalue = method + ',' + path;
                var optlabel = method + ' ' + path;
                if('tags' in apiOpDef){
                    optlabel += ' (' + apiOpDef.tags.join(',') + ')';
                }
                var elemOption = $('<option value="'+optvalue+'">'+optlabel+'</option>');
                elemOptGroup.append(elemOption);
            }
            elemSelect.append(elemOptGroup);
        }
        // update
        elemSelect.trigger("chosen:updated");
    };

    SWSApiOpSel.prototype.getvalue = function(res) {
        if(typeof res !== 'object') return;
        var val = this.$element.find(".sws-chosen-select").val();
        var vals = val.split(',',2);
        if(vals.length==2) {
            res.method = vals[0];
            res.path = vals[1];
        }
        console.log('Selected: ' + val);
    };

    SWSApiOpSel.prototype.setvalue = function(val) {
        this.$element.find(".sws-chosen-select").val(val).trigger('chosen:updated');
    };

    SWSApiOpSel.prototype.destroy = function () {
        this.$element.empty();
	};

    SWSApiOpSel.prototype.render = function () {

		this.$element.empty();
        var that = this;
        var selectHTML = pluginTemplates.select;

        var elemSelect = $(selectHTML);
        this.$element.append(elemSelect);

        this.$element.find(".sws-chosen-select").on('change',function(e){
            // Raise event on parent element
            that.$element.trigger('sws-onchange-apiop', that);
        });

        this.$element.find(".sws-chosen-select").chosen({search_contains:true});
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
                $.data(this, pluginName, new SWSApiOpSel( this, options, args ));
			}
		});
		return result || this;
	};

})(jQuery, window, document);
