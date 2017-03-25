/*
 * swagger-stats UI - Dashboard Layout Definition
 */

// Definition of SWS UI Dashboard Layout

var SWSLayout = function(){

    this.name = "swagger-stats";
    this.startpage = "sws_summary";

    this.pages = {
        sws_summary: {},
        sws_requests: {},
        sws_errors: {},
        sws_api: {}
    };

    SWSLayout.prototype.init = function(options){
        this.defineSummaryPage();
        this.defineRequestsPage();
        this.defineErrorsPage();
        this.defineApiPage();
    };

    SWSLayout.prototype.defineSummaryPage = function(options){
        var page = {
            title: 'Summary',
            icon: 'fa-line-chart',
            datauri: "/swagger-stats/data",
            datastore: "apistats",
            datevent: 'sws-ondata-summary-ex',
            rows: {
                r1: {
                    columns: {
                        sws_summ_wRq  : { class:"col-md-2", type: "widget", title: 'Requests', subtitle:'Total received requests' },
                        sws_summ_wRRte: { class:"col-md-2", type: "widget", title: 'Request Rate', subtitle:'Req/sec on last time interval' },
                        sws_summ_wERte: { class:"col-md-2", type: "widget", title: 'Error Rate', subtitle:'Err/sec on last time interval', postProcess:'redIfNonZero' },
                        sws_summ_wAHt : { class:"col-md-2", type: "widget", title: 'Avg Handle Time', subtitle:'Average Handle Time(ms)' },
                        sws_summ_wMHt : { class:"col-md-2", type: "widget", title: 'Max Handle Time', subtitle:'Max Handle Time(ms)' },
                        sws_summ_wRrCl: { class:"col-md-2", type: "widget", title: 'Requests Payload', subtitle:'Total content len (bytes)' },
                    }
                },
                r2: {
                    columns: {
                        sws_summ_wErr : { class:"col-md-2", type: "widget", title: 'Errors', subtitle:'Total Error Responses', postProcess:'redIfNonZero' },
                        sws_summ_wSs  : { class:"col-md-2", type: "widget", title: 'Success', subtitle:'Success Responses', postProcess:'successIfNonZero' },
                        sws_summ_wRed : { class:"col-md-2", type: "widget", title: 'Redirect', subtitle:'Redirect Responses' },
                        sws_summ_wCe  : { class:"col-md-2", type: "widget", title: 'Client Error', subtitle:'Client Error Responses', postProcess:'redIfNonZero' },
                        sws_summ_wSe  : { class:"col-md-2", type: "widget", title: 'Server Error', subtitle:'Server Error Responses', postProcess:'redIfNonZero' },
                        sws_summ_wReCl: { class:"col-md-2", type: "widget", title: 'Responses Payload', subtitle:'Total content len (bytes)' }
                    }
                },
                r3: {
                    columns: {
                        sws_summ_cTl  : {
                            class:"col-lg-12",
                            type: "chart",
                            options: { title:'Request and Responses over last 60 minutes', type: 'bar', height:"80px" },
                            chartdata: {
                                labels: [],
                                datasets: [
                                    { label: "Success",type: 'bar',backgroundColor: '#1c84c6',data: [] },
                                    { label: "Redirect",type: 'bar',backgroundColor: '#d2d2d2',data: [] },
                                    { label: "Client Error", type: 'bar', backgroundColor: '#f8ac59',data: [] },
                                    { label: "Server Error", type: 'bar', backgroundColor: '#ed5565',data: [] }
                                ]
                            },
                            chartoptions : {
                                responsive: true,
                                scales: { xAxes: [{stacked: true}],yAxes: [{stacked: true}]}
                            }
                        }
                    }
                }
            }
        }
        this.pages.sws_summary = page;
    };

    SWSLayout.prototype.defineRequestsPage = function(options) {
        var page = {
            title: 'Requests',
            icon: 'fa-exchange',
            datauri: "/swagger-stats/data",
            datastore: "apistats",
            datevent: 'sws-ondata-requests-ex',
            rows: {
                r1: {
                    columns: {
                        sws_req_tRbM: {
                            class:"col-lg-12",
                            type: "datatable",
                            options: {},
                            dataTableSettings:{
                                pageLength: 25,
                                columns: [
                                    {title:'Method', width:'10%', render:function( data, type, full, meta ) {
                                        return '<span class="badge badge-table badge-info">'+data+'</span>';
                                    }},
                                    {title:'Requests', class: 'strong' },
                                    {title:'Errors', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Req Rate'},
                                    {title:'Err Rate', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Success'},
                                    {title:'Redirect'},
                                    {title:'Client Error', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Server Error', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Total Time(ms)',visible:false},
                                    {title:'Max Time(ms)'},
                                    {title:'Avg Time(ms)'},
                                    {title:'Total Req Payload',visible:false},
                                    {title:'Max Req Payload',visible:false},
                                    {title:'Avg Req Payload'},
                                    {title:'Total Res Payload',visible:false},
                                    {title:'Max Res Payload',visible:false},
                                    {title:'Avg Res Payload'}
                                ],
                                responsive: true,
                                bPaginate: false,
                                bFilter:false,
                                bInfo: false,
                                dom: '<"html5buttons"B>lTfgitp',
                                buttons: ['copy','csv','colvis'],
                                "order": [[ 1, "desc" ]]
                            }
                        }
                    }
                },
                r2: {
                    columns: {
                        sws_req_cRbM  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Requests By Method', height:"100px" },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { position: 'right' },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        }
                    }
                }
            }
        };
        this.pages.sws_requests = page;
    };

    SWSLayout.prototype.defineErrorsPage = function(options) {
        var page = {
            title: 'Last Errors',
            icon: 'fa-exclamation-circle',
            datauri: "/swagger-stats/data/lasterrors",
            datastore: "lasterrors",
            datevent: 'sws-ondata-lasterrors-ex',
            rows: {
                r1: {
                    columns: {
                        sws_err_tErr: {
                            class:"col-lg-12",
                            type: "datatable",
                            options: {expand:true},
                            dataTableSettings:{
                                pageLength: 25,
                                columns: [
                                    {title:'', width:'0%', searchable:false, orderable:false,
                                        class: 'sws-row-expand text-center cursor-pointer',
                                        render:function( data, type, full, meta ) {
                                        return '<i class="fa fa-caret-right">';
                                    }},
                                    {title:'Time', width:'20%'},
                                    {title:'Method', render:function( data, type, full, meta ) {
                                        return '<span class="badge badge-table badge-info">'+data+'</span>';
                                    }},
                                    {title:'URL', width:'30%'},
                                    {title:'Code', class:'strong'},
                                    {title:'Class'},
                                    {title:'Duration'},
                                    {title:'Message', width:'30%'}
                                ],
                                responsive: true,
                                dom: '<"html5buttons"B>lTfgitp',
                                buttons: ['copy','csv'],
                                order: [[1, "desc"]]
                            },
                            showDetails: function(row){
                                row.child( '<pre><code class="json">'+row.data()[8]+'</code></pre>' ).show();
                                $('pre code:not(.hljs)').each(function(i, block) {
                                    hljs.highlightBlock(block);
                                });
                            }
                        }
                    }
                }
            }
        };
        this.pages.sws_errors = page;
    };

    SWSLayout.prototype.defineApiPage = function(options) {
        var page = {
            title: 'API Calls',
            icon: 'fa-code',
            datauri: "/swagger-stats/data",
            datastore: "apistats",
            datevent: 'sws-ondata-api-ex',
            rows: {
                r1: {
                    columns: {
                        sws_api_tApi: {
                            class:"col-lg-12",
                            type: "datatable",
                            options: {expand:true},
                            dataTableSettings: {
                                pageLength: 25,
                                columns: [
                                    {title:'', width:'0%', searchable:false, orderable:false,
                                        class: 'sws-row-expand text-center cursor-pointer',
                                        render:function( data, type, full, meta ) {
                                            return '<i class="fa fa-caret-right">';
                                        }},
                                    {title:'Path', width:'20%', class:'strong'},
                                    {title:'Method', render:function( data, type, full, meta ) {
                                        return '<span class="badge badge-table badge-info">'+data+'</span>';
                                    }},
                                    {title:'Swagger'},
                                    {title:'Deprecated',visible:false},
                                    {title:'Requests', class:'strong'},
                                    {title:'Errors', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Req Rate'},
                                    {title:'Err Rate', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Success'},
                                    {title:'Redirect'},
                                    {title:'Client Error', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Server Error', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
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
                            },
                            showDetails: function(row){
                                var alertClass = 'alert-warning';
                                var detailsContent = '';
                                var rData = row.data();
                                if(row.data()[4] == 'Yes'){
                                    detailsContent = '<strong>DEPRECATED</strong><br/>';
                                    alertClass = 'alert-danger';
                                }
                                detailsContent += row.data()[17] != '' ? '<strong>operationId: </strong>'+ row.data()[17] +'<br/>' : '';
                                detailsContent += row.data()[18] != '' ? '<strong>Summary: </strong>'+ row.data()[18] +'<br/>' : '';
                                detailsContent += row.data()[19] != '' ? '<strong>Description: </strong>'+ row.data()[19] +'<br/>': '';
                                detailsContent += row.data()[20] != '' ? '<strong>Tags: </strong>'+ row.data()[20] : '';
                                row.child( '<div class="alert '+alertClass+'">'+detailsContent+'</div>' ).show();
                            }
                        }
                    }
                }
            }
        };
        this.pages.sws_api = page;
    };

};
