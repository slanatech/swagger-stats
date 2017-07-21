/*
 * swagger-stats UI - Table plugin
 */

;(function ($, window, document, undefined) {

	/*global jQuery, console*/

	'use strict';

	var pluginName = 'swstable';

    var pluginTemplates = {
        datatable: '<div class="swsbox float-e-margins"><div class="swsbox-title" style="display: none"><h5></h5></div>\
                    <div class="swsbox-content">\
                    <div class="table-responsive">\
                    <table id="%id%" class="table table-striped table-bordered table-condensed table-hover" width="100%">\
                    </table>\
                    </div></div></div>'
    };

	var _default = {};
	_default.settings = {
        swsId: '',          // Sws Dashboard Element Id, to emit events on
        expand: false       // Support row expand / collapse
	};

	var SWSTable = function (element, options, args) {

		this.$element = $(element);
		this.elementId = element.id;

        this.dataTableSettings = null;
        this.dataTableId = null;
        this.dataTable = null;

        // Function to show details row in a page ( expand/collapse)
        this.showDetails = null;

		this.init( options, args );

		return {
			options: this.options,
			init: $.proxy(this.init, this),
            //remove: $.proxy(this.remove, this),
            clear: $.proxy(this.clear, this),
            rowadd: $.proxy(this.rowadd, this),
            update: $.proxy(this.update, this)
		};
	};

    SWSTable.prototype.init = function ( options, args ) {

        _default.settings.id = 'sws_tbl_'+(Math.round(Math.random()*100000)).toString();     // Default id of API table
		this.options = $.extend({}, _default.settings, options);

		this.dataTableId = this.options.id;

        if( args && 'dataTableSettings' in args ) {
            this.dataTableSettings = args.dataTableSettings;
        }
        if( args && 'showDetails' in args ) {
            this.showDetails = args.showDetails;
        }

        this.destroy();
        this.render();
	};

    /*
    SWSTable.prototype.remove = function () {
		this.destroy();
		$.removeData(this, pluginName);
	};
    */

    SWSTable.prototype.clear = function () {
        this.dataTable.clear();
    };

    SWSTable.prototype.rowadd = function (data) {
        if('row' in data) {
            this.dataTable.row.add(data.row);
        }
    };

    SWSTable.prototype.update = function (data) {
        this.dataTable.columns.adjust().draw();
        this.dataTable.draw();
    };

    SWSTable.prototype.destroy = function () {
        this.$element.empty();
	};

    SWSTable.prototype.render = function () {

		this.$element.empty();

        var tableHTML = pluginTemplates.datatable
            .replace('%id%',this.dataTableId);

        var elemTable = $(tableHTML);
        this.$element.append(elemTable);

        // Title
        if('title' in this.options){
            this.$element.find('.swsbox-title').show().find('h5').html(this.options.title);
        }

        this.dataTable = $('#'+this.dataTableId).DataTable(this.dataTableSettings);

        // Expand/Collapse
        // Add event listener for opening and closing details
        var that = this;
        if( this.options.expand && (this.showDetails!=null)) {
            $('#' + this.dataTableId).on('click', 'td.sws-row-expand', function () {
                var tr = $(this).closest('tr');
                var tdi = $(this).find('i');
                var row = that.dataTable.row(tr);
                if (row.child.isShown()) {
                    row.child.hide();
                    tdi.removeClass('fa-caret-down');
                    tdi.addClass('fa-caret-right');
                }
                else {
                    that.showDetails(row);
                    tdi.removeClass('fa-caret-right');
                    tdi.addClass('fa-caret-down');
                }
            });
        }
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
                $.data(this, pluginName, new SWSTable( this, options, args ));
			}
		});
		return result || this;
	};

})(jQuery, window, document);
