/*
 * swagger-stats UI plugin
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

        this.tools = {};

		this.init(options);

		return {

			// Options (public access)
			options: this.options,

			// Initialize / destroy methods
			init: $.proxy(this.init, this),
			remove: $.proxy(this.remove, this),

			// TODO methods
		};
	};

    SWSUI.prototype.init = function (options) {
		this.options = $.extend({}, _default.settings, options);

        this.tools = {
            "#sws-summary" : {id:'sws-summary', title:'Summary', icon:'fa-line-chart', handler: this.showSummary },
            "#sws-requests": {id:'sws-requests', title:'Requests', icon:'fa-exchange', handler: this.showRequests},
            "#sws-errors": {id:'sws-errors', title:'Errors', icon:'fa-ban', handler: this.showErrors}
        };

		this.destroy();
		this.subscribeEvents();
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


    SWSUI.prototype.showSummary = function () {
        console.log('showSummary');
        var elemHdr = $('<div class="page-header"><h1>Summary</h1></div>');
        $('#sws-content').append(elemHdr);

    };

    SWSUI.prototype.showRequests = function () {
        console.log('showRequests');
        var elemHdr = $('<div class="page-header"><h1>Requests</h1></div>');
        $('#sws-content').append(elemHdr);
    };

    SWSUI.prototype.showErrors = function () {
        console.log('showErrors');
        var elemHdr = $('<div class="page-header"><h1>Errors</h1></div>');
        $('#sws-content').append(elemHdr);
    };

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

        /*
        for(var i=0;i<this.tools.length;i++){
            var tool = this.tools[i];
            var toolElem = $('<li id='+tool.id+' class="sws-tool-li"><a href="#'+tool.id+'" data-toggle="tooltip" title="'+tool.title+'"><i class="fa '+tool.icon+'"></i></a></li>');
            $('#sws-toolbar').append(toolElem);
        }
        */

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
            window.location.hash = '#sws-summary'
        }

    };

    // Set specified tool menu to active state
    SWSUI.prototype.setActive = function(toolId){
        console.log('setActive:' + toolId);
        // Highloght active tool
        $('.sws-tool-li').each(function(index){
           var thisToolId = '#'+ this.id;
           if( thisToolId == toolId){
               $(this).addClass('active');
           }else{
               $(this).removeClass('active');
           }
        });

        // Clear content
        $('#sws-content').empty();

        // Show new content
        if( toolId in this.tools){
            this.tools[toolId].handler();
        }

    };




    // Starting from the root node, and recursing down the
	// structure we build the sidebar one node at a time
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
