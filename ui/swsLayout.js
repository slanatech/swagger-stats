/*
 * swagger-stats UI - Dashboard Layout Definition
 */

// Definition of SWS UI Dashboard Layout

var SWSLayout = function(){

    this.name = "swagger-stats";
    this.startpage = "sws_summary";
    this.loginpage = "sws_login";

    this.pages = {
        sws_summary: {},
        sws_requests: {},
        sws_errors: {},
        sws_lasterrors: {},
        sws_longestreq: {},
        sws_rates: {},
        sws_payload: {},
        sws_api: {},
        sws_apiop: {},
        sws_login: {}
    };

    SWSLayout.prototype.init = function(options){
        this.defineSummaryPage();
        this.defineRequestsPage();
        this.defineErrorsPage();
        this.defineLastErrorsPage();
        this.defineLongestReqPage();
        this.defineRatesPage();
        this.definePayloadPage();
        this.defineApiPage();
        this.defineApiOpPage();
        this.defineLoginPage();
    };

    SWSLayout.prototype.defineSummaryPage = function(options){
        var page = {
            title: 'Summary',
            icon: 'fa-line-chart',
            datevent: 'sws-ondata-summary',
            getdata: {
                type: "get",
                url: "stats",
                data: { fields: ['timeline','apidefs','apistats'] }
            },
            rows: {
                r0: {
                    class: "sws-row-hdr",
                    columns: {
                        sws_summ_title : { class:"col-md-4", type: "title"},
                        sws_summ_empty : { class:"col-md-8", type: "empty"}
                    }
                },
                r1: {
                    columns: {
                        sws_summ_wRq  : { class:"col-md-2", type: "widget", title: 'Requests', subtitle:'Total requests received' },
                        //sws_summ_wRp  : { class:"col-md-2", type: "widget", title: 'Processing', subtitle:'Requests in processing' },
                        sws_summ_wApd  : { class:"col-md-2", type: "widget", title: 'Apdex Score', subtitle:'Overall Apdex Score', postProcess:'successIfNonZero' },
                        sws_summ_wRRte: { class:"col-md-2", type: "widget", title: 'Current Req Rate', subtitle:'Req rate on last time interval', postProcess:'successIfNonZero' },
                        sws_summ_wERte: { class:"col-md-2", type: "widget", title: 'Current Err Rate', subtitle:'Err rate on last time interval', postProcess:'redIfNonZero' },
                        sws_summ_wCpu:  { class:"col-md-2", type: "widget", title: 'CPU Usage', subtitle:'Process CPU Usage %', postProcess:'redIfNonZero' },
                        sws_summ_wMem:  { class:"col-md-2", type: "widget", title: 'Memory Usage', subtitle:'Used Heap', postProcess:'redIfNonZero' },
                        //sws_summ_wMHt : { class:"col-md-2", type: "widget", title: 'Max HT', subtitle:'Longest Req of all time' }
                    }
                },
                r2: {
                    columns: {
                        //sws_summ_wRs  : { class:"col-md-2", type: "widget", title: 'Responses', subtitle:'Total responses sent' },
                        sws_summ_wErr : { class:"col-md-2", type: "widget", title: 'Errors', subtitle:'Total Error Responses', postProcess:'redIfNonZero' },
                        sws_summ_wSs  : { class:"col-md-2", type: "widget", title: 'Success', subtitle:'Success Responses', postProcess:'successIfNonZero' },
                        sws_summ_wRed : { class:"col-md-2", type: "widget", title: 'Redirect', subtitle:'Redirect Responses' },
                        sws_summ_wCe  : { class:"col-md-2", type: "widget", title: 'Client Error', subtitle:'Client Error Responses', postProcess:'redIfNonZero' },
                        sws_summ_wSe  : { class:"col-md-2", type: "widget", title: 'Server Error', subtitle:'Server Error Responses', postProcess:'redIfNonZero' },
                        sws_summ_wAHt : { class:"col-md-2", type: "widget", title: 'Avg HT', subtitle:'Average Handle Time' }
                    }
                },
                r3: {
                    columns: {
                        sws_summ_cCpu  : {
                            class:"col-lg-12",
                            type: "chart",
                            options: { title:'CPU Usage % over last 60 minutes', type: 'line', height:"140px" },
                            chartdata: {
                                labels: [],
                                datasets: [
                                    { label: "CPU", borderColor: '#FCE38A', backgroundColor: '#FCE38A',data: [] }
                                ]
                            },
                            chartoptions : {
                                responsive: true,
                                maintainAspectRatio: false,
                                legend: { display: false },
                                scales: { xAxes: [],
                                          yAxes: [{ ticks: {
                                            callback: function(value, index, values) { return value.toFixed(1)+' %';}
                                        }}]
                                }
                            }
                        }
                    }
                },

                // TEMP
                /*
                r4: {
                    columns: {
                        sws_summ_cMem  : {
                            class:"col-lg-12",
                            type: "chart",
                            options: { title:'Memory Usage over last 60 minutes', type: 'line', height:"140px" },
                            chartdata: {
                                labels: [],
                                datasets: [
                                    { label: "Memory", borderColor: '#95E1D3', backgroundColor: '#95E1D3',data: [] }
                                ]
                            },
                            chartoptions : {
                                responsive: true,
                                maintainAspectRatio: false,
                                legend: { display: false },
                                scales: { xAxes: [],
                                    yAxes: [{ ticks: {
                                        callback: function(value, index, values) { return $.swsui.formatBytes(value,1);}
                                    }}]
                                }
                            }
                        }
                    }
                },
                */

                r5: {
                    columns: {
                        /* Enable stacked area chart type
                        sws_summ_cTl  : {
                            class:"col-lg-12",
                            type: "chart",
                            options: { title:'Request and Responses over last 60 minutes', type: 'line', height:"450px" },
                            chartdata: {
                                labels: [],
                                // #5eb5ec, #d0e2f0, #fcd986, #fd8b96
                                datasets: [
                                    { label: "Success", borderColor: '#95E1D3', backgroundColor: '#95E1D3',data: [] },
                                    { label: "Redirect", borderColor: '#EAFFD0', backgroundColor: '#EAFFD0',data: [] },
                                    { label: "Client Error", borderColor: '#FCE38A',backgroundColor: '#FCE38A',data: [] },
                                    { label: "Server Error", borderColor: '#F38181', backgroundColor: '#F38181',data: [] }
                                ]
                            },
                            chartoptions : {
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: { xAxes: [],yAxes: [{stacked: true}]}
                            }
                        }*/
                        sws_summ_cTl  : {
                            class:"col-lg-12",
                            type: "chart",
                            options: { title:'Request and Responses over last 60 minutes', type: 'bar', height:"360px" },
                            chartdata: {
                                labels: [],
                                // #5eb5ec, #d0e2f0, #fcd986, #fd8b96
                                datasets: [
                                    { label: "Success",type: 'bar', borderColor: '#95E1D3', backgroundColor: '#95E1D3',data: [] },
                                    { label: "Redirect",type: 'bar', borderColor: '#EAFFD0', backgroundColor: '#EAFFD0',data: [] },
                                    { label: "Client Error", type: 'bar', borderColor: '#FCE38A',backgroundColor: '#FCE38A',data: [] },
                                    { label: "Server Error", type: 'bar', borderColor: '#F38181', backgroundColor: '#F38181',data: [] }
                                ]
                            },
                            chartoptions : {
                                responsive: true,
                                maintainAspectRatio: false,
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
            datevent: 'sws-ondata-requests',
            getdata: {
                type: "get",
                url: "stats",
                data: { fields: ['method'] }
            },
            rows: {
                r0: {
                    class: "sws-row-hdr",
                    columns: {
                        sws_req_title : { class:"col-md-4", type: "title"},
                        sws_req_empty : { class:"col-md-8", type: "empty"}
                    }
                },
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
                                    {title:'Responses'},
                                    {title:'Processing',render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-warning">'+data+'</span>';
                                        return data;
                                    }},
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
                                    {title:'Apdex Score', render:function( data, type, full, meta ) {
                                        if(data<0.5) return '<span class="badge badge-table badge-warning">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Total Time(ms)',visible:false},
                                    {title:'Max Handle Time(ms)'},
                                    {title:'Avg Handle Time(ms)'},
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
                        },
                        sws_req_cEbM  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Errors By Method', height:"100px", type: 'doughnut' },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { position: 'right' },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        },
                        sws_req_cRTime  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Avg Handle Time', height:"100px",type: 'bar' },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { display: false },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        }
                    }
                },
                r3: {
                    columns: {
                        sws_req_cRProc  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Requests in processing', height:"100px",type: 'bar' },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { display: false },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        },
                        sws_req_cRRbM  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Request Rate By Method', height:"100px", type: 'bar' },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { display: false },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        },
                        sws_req_cERbM  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Error Rate By Method', height:"100px", type: 'bar' },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { display: false },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        }
                    }
                }
                /* TODO
                r3: {
                    columns: {
                        sws_req_cuHist  : {
                            class:"col-lg-12",
                            type: "cubism",
                            options: { title:'Requests Trends' }
                        }
                    }
                }*/
            }
        };
        this.pages.sws_requests = page;
    };

    SWSLayout.prototype.defineErrorsPage = function(options) {
        var page = {
            title: 'Errors',
            icon: 'fa-exclamation-circle',
            datevent: 'sws-ondata-errors',
            getdata: {
                type: "get",
                url: "stats",
                data: { fields: ['errors'] }
            },
            rows: {
                r0: {
                    class: "sws-row-hdr",
                    columns: {
                        sws_err_title : { class:"col-md-4", type: "title"},
                        sws_err_empty : { class:"col-md-8", type: "empty"}
                    }
                },
                r1: {
                    columns: {
                        sws_err_tCode: {
                            class:"col-lg-4",
                            type: "datatable",
                            options: {title:'Errors by Status Code'},
                            dataTableSettings:{
                                pageLength: 5,
                                columns: [
                                    {title:'Status Code', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Reason-Phrase'},
                                    {title:'Count', class: 'strong'}
                                ],
                                //scrollY:'200px',
                                responsive: true,
                                bPaginate: true,
                                bLengthChange: false,
                                bFilter:true,
                                bInfo: false,
                                dom: '<"html5buttons"B>lTfgitp',
                                buttons: ['copy','csv'],
                                order: [[2, "desc"]]
                            }
                        },
                        sws_err_cCode  : {
                            class:"col-lg-8",
                            type: "chart",
                            options: { title:'Errors by Status Code', height: "310px", type: 'bar' },
                            chartdata: { labels: [], datasets: [{data:[],borderColor: '#F38181', backgroundColor: '#F38181'}] },
                            chartoptions : {
                                responsive: true,
                                maintainAspectRatio: false,
                                legend: { display: false },
                                animation: { animateScale: true, animateRotate: true },
                                tooltips: { callbacks: { title: function(ttItem,data){
                                    var xLabel = ttItem[0].xLabel;
                                    var extLabel = (xLabel in $.swsui.httpStatusCodes ? $.swsui.httpStatusCodes[xLabel] : '');
                                    return xLabel + ' ' + extLabel;
                                }} }
                            }
                        }
                    }
                },
                r2:{
                    columns: {
                        sws_err_t404: {
                            class: "col-lg-6",
                            type: "datatable",
                            options: {title:'Top 404 Not Found Path Count'},
                            dataTableSettings: {
                                pageLength: 10,
                                columns: [
                                    {title: 'Not Found Path', class: 'strong'},
                                    {title: 'Count', class: 'strong'}
                                ],
                                responsive: true,
                                bPaginate: true,
                                bFilter: true,
                                bInfo: false,
                                dom: '<"html5buttons"B>lTfgitp',
                                buttons: ['copy', 'csv'],
                                order: [[1, "desc"]]
                            }
                        },
                        sws_err_t500: {
                            class: "col-lg-6",
                            type: "datatable",
                            options: {title:'Top 500 Internal Server Error Path Count'},
                            dataTableSettings: {
                                pageLength: 10,
                                columns: [
                                    {title: 'Server Error Path', class: 'strong'},
                                    {title: 'Count', class: 'strong'}
                                ],
                                responsive: true,
                                bPaginate: true,
                                bFilter: true,
                                bInfo: false,
                                dom: '<"html5buttons"B>lTfgitp',
                                buttons: ['copy', 'csv'],
                                order: [[1, "desc"]]
                            }
                        }
                    }
                }
            }
        };
        this.pages.sws_errors = page;
    };


    SWSLayout.prototype.defineLastErrorsPage = function(options) {
        var page = {
            title: 'Last Errors',
            icon: 'fa-exclamation',
            datevent: 'sws-ondata-lasterrors',
            getdata: {
                type: "get",
                url: "stats",
                data: { fields: ['lasterrors'] }
            },
            rows: {
                r0: {
                    class: "sws-row-hdr",
                    columns: {
                        sws_lerr_title : { class:"col-md-4", type: "title"},
                        sws_lerr_empty : { class:"col-md-8", type: "empty"}
                    }
                },
                r1: {
                    columns: {
                        sws_lerr_tErr: {
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
                                    {title:'Path', width:'30%'},
                                    {title:'Response Time'},
                                    {title:'Code', class:'strong'},
                                    {title:'Class'},
                                    {title:'Phrase', width:'30%'}
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
        this.pages.sws_lasterrors = page;
    };

    SWSLayout.prototype.defineLongestReqPage = function(options) {
        var page = {
            title: 'Longest Requests',
            icon: 'fa-hourglass-end',
            datevent: 'sws-ondata-longestreq',
            getdata: {
                type: "get",
                url: "stats",
                data: { fields: ['longestreq'] }
            },
            rows: {
                r0: {
                    class: "sws-row-hdr",
                    columns: {
                        sws_lreq_title : { class:"col-md-4", type: "title"},
                        sws_lreq_empty : { class:"col-md-8", type: "empty"}
                    }
                },
                r1: {
                    columns: {
                        sws_lreq_tReq: {
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
                                    {title:'Path', width:'30%'},
                                    {title:'Response Time',render:function( data, type, full, meta ) {
                                        return '<span class="badge badge-table badge-warning">'+data+'</span>';
                                    }},
                                    {title:'Code', class:'strong'},
                                    {title:'Class'},
                                    {title:'Phrase', width:'30%'}
                                ],
                                responsive: true,
                                dom: '<"html5buttons"B>lTfgitp',
                                buttons: ['copy','csv'],
                                order: [[4, "desc"]]
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
        this.pages.sws_longestreq = page;
    };

    SWSLayout.prototype.defineRatesPage = function(options){
        var page = {
            title: 'Rates & Durations',
            icon: 'fa-clock-o',
            datevent: 'sws-ondata-rates',
            getdata: {
                type: "get",
                url: "stats",
                data: { fields: ['timeline'] }
            },
            rows: {
                r0: {
                    class: "sws-row-hdr",
                    columns: {
                        sws_rates_title : { class:"col-md-4", type: "title"},
                        sws_rates_empty : { class:"col-md-8", type: "empty"}
                    }
                },
                r1: {
                    columns: {
                        sws_rates_wApd : { class:"col-md-2", type: "widget", title: 'Current Apdex Score', subtitle:'Apdex Score on last time interval', postProcess:'successIfNonZero' },
                        sws_rates_wRqR : { class:"col-md-2", type: "widget", title: 'Current Req Rate', subtitle:'Req rate on last time interval', postProcess:'successIfNonZero' },
                        sws_rates_wErR:  { class:"col-md-2", type: "widget", title: 'Current Err Rate', subtitle:'Err rate on last time interval', postProcess:'redIfNonZero' },
                        sws_rates_wMHT : { class:"col-md-2", type: "widget", title: 'Current Max HT', subtitle:'Longest Req on last 60 sec',postProcess:'successIfNonZero' },
                        sws_rates_wAHT : { class:"col-md-2", type: "widget", title: 'Current Avg HT', subtitle:'Avg Handle Time on last 60 sec',postProcess:'successIfNonZero' },
                        sws_rates_wSHT : { class:"col-md-2", type: "widget", title: 'Current Sum HT', subtitle:'Sum Handle Time on last 60 sec',postProcess:'successIfNonZero' }
                    }
                },
                r2: {
                    columns: {
                        sws_rates_wOApd : { class:"col-md-2", type: "widget", title: 'Overall Apdex Score', subtitle:'Apdex Score of all time',postProcess:'successIfNonZero' },
                        sws_rates_wORqR : { class:"col-md-2", type: "widget", title: 'Overall Req Rate', subtitle:'Req rate of all time',postProcess:'successIfNonZero' },
                        sws_rates_wOErR : { class:"col-md-2", type: "widget", title: 'Overall Err Rate', subtitle:'Err rate of all time',postProcess:'redIfNonZero' },
                        sws_rates_wOMHT : { class:"col-md-2", type: "widget", title: 'Overall Max HT', subtitle:'Longest Req of all time' },
                        sws_rates_wOAHT : { class:"col-md-2", type: "widget", title: 'Overall Avg HT', subtitle:'Avg Handle Time of all time' },
                        sws_rates_wOSHT : { class:"col-md-2", type: "widget", title: 'Overall HT', subtitle:'Sum Handle Time of all time' }
                    }
                },

                r3: {
                    columns: {
                        sws_rates_cApd  : {
                            class:"col-lg-12",
                            type: "chart",
                            options: { title:'Apdex Score Trend', type: 'line', height:"140px" },
                            chartdata: {
                                labels: [],
                                datasets: [
                                    { label: "Apdex Score", borderColor: '#FCE38A', backgroundColor: '#FCE38A',data: [] }
                                ]
                            },
                            chartoptions : {
                                responsive: true,
                                maintainAspectRatio: false,
                                legend: { display: false }
                            }
                        }
                    }
                },

                r4: {
                    columns: {
                        sws_rates_cRER  : {
                            class:"col-lg-12",
                            type: "chart",
                            options: { title:'Requests and Errors Rate Trend', type: 'line', height:"55px" },
                            chartdata: {
                                labels: [],
                                datasets: [
                                    { label: "Request Rate", borderColor:'#95E1D3', backgroundColor:'#95E1D3',fill:false, data: [] },
                                    { label: "Error Rate", borderColor:'#F38181', backgroundColor:'#F38181',fill:false, data: [] },
                                ]
                            },
                            chartoptions : {
                                responsive: true,
                                tooltips: { mode: 'index', intersect: false },
                                hover: { mode: 'nearest', intersect: true }
                            }
                        }
                    }
                }
            }
        };
        this.pages.sws_rates = page;
    };

    SWSLayout.prototype.definePayloadPage = function(options){
        var page = {
            title: 'Payload',
            icon: 'fa-file-text',
            datevent: 'sws-ondata-payload',
            getdata: {
                type: "get",
                url: "stats",
                data: { fields: ['timeline'] }
            },
            rows: {
                r0: {
                    class: "sws-row-hdr",
                    columns: {
                        sws_payl_title : { class:"col-md-4", type: "title"},
                        sws_payl_empty : { class:"col-md-8", type: "empty"}
                    }
                },
                r1: {
                    columns: {
                        sws_payl_wTRqP : { class:"col-md-2", type: "widget", title: 'Received', subtitle:'Sum requests content len',postProcess:'successIfNonZero' },
                        sws_payl_wMRqP : { class:"col-md-2", type: "widget", title: 'Max Req Payload', subtitle:'Max request content len',postProcess:'successIfNonZero' },
                        sws_payl_wARqP : { class:"col-md-2", type: "widget", title: 'Avg Req Payload', subtitle:'Avg request content len',postProcess:'successIfNonZero' },
                        sws_payl_wTRsP : { class:"col-md-2", type: "widget", title: 'Sent', subtitle:'Sum response content len',postProcess:'successIfNonZero' },
                        sws_payl_wMRsP : { class:"col-md-2", type: "widget", title: 'Max Res Payload', subtitle:'Max response content len',postProcess:'successIfNonZero' },
                        sws_payl_wARsP : { class:"col-md-2", type: "widget", title: 'Avg Res Payload', subtitle:'Avg response content len',postProcess:'successIfNonZero' }
                    }
                },
                r2: {
                    columns: {
                        sws_payl_cRqPl  : {
                            class:"col-lg-12",
                            type: "chart",
                            options: { title:'Requests payload over last 60 min', type: 'line', height:"55px" },
                            chartdata: {
                                labels: [],
                                datasets: [
                                    { label: "Received", borderColor:'#95E1D3', backgroundColor:'#95E1D3',fill:false, data: [] },
                                    { label: "Avg Request Payload", borderColor:'#FCE38A', backgroundColor:'#FCE38A',fill:false, data: [] },
                                    { label: "Max Request Payload", borderColor:'#F38181', backgroundColor:'#F38181',fill:false, data: [] },
                                ]
                            },
                            chartoptions : {
                                responsive: true,
                                tooltips: { mode: 'index', intersect: false },
                                hover: { mode: 'nearest', intersect: true }
                            }
                        }
                    }
                },
                r3: {
                    columns: {
                        sws_payl_cRsPl  : {
                            class:"col-lg-12",
                            type: "chart",
                            options: { title:'Responses payload over last 60 min', type: 'line', height:"55px" },
                            chartdata: {
                                labels: [],
                                datasets: [
                                    { label: "Sent", borderColor:'#95E1D3', backgroundColor:'#95E1D3',fill:false, data: [] },
                                    { label: "Avg Response Payload", borderColor:'#FCE38A', backgroundColor:'#FCE38A',fill:false, data: [] },
                                    { label: "Max Response Payload", borderColor:'#F38181', backgroundColor:'#F38181',fill:false, data: [] }
                                ]
                            },
                            chartoptions : {
                                responsive: true,
                                tooltips: { mode: 'index', intersect: false },
                                hover: { mode: 'nearest', intersect: true }
                            }
                        }
                    }
                }
            }
        };
        this.pages.sws_payload = page;
    };


    SWSLayout.prototype.defineApiPage = function(options) {
        var page = {
            title: 'API Calls',
            icon: 'fa-code',
            datevent: 'sws-ondata-api',
            getdata: {
                type: "get",
                url: "stats",
                data: { fields: ['apistats'] }
            },
            getfieldsonce:['apidefs'],
            rows: {
                r0: {
                    class: "sws-row-hdr",
                    columns: {
                        sws_api_title : { class:"col-md-4", type: "title"},
                        sws_api_empty : { class:"col-md-8", type: "empty"}
                    }
                },
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
                                    {title:'Path', width:'20%', class:'strong',render:function( data, type, full, meta ) {
                                        return '<a href="#sws_apiop='+full[2]+','+data+'">'+data+'</a>';
                                    }},
                                    {title:'Method', render:function( data, type, full, meta ) {
                                        return '<span class="badge badge-table badge-info">'+data+'</span>';
                                    }},
                                    {title:'Swagger'},
                                    {title:'Deprecated',visible:false},
                                    {title:'Requests', class:'strong'},
                                    {title:'Responses'},
                                    {title:'Processing',render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-warning">'+data+'</span>';
                                        return data;
                                    }},
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
                                    {title:'Apdex Score', render:function( data, type, full, meta ) {
                                        if(data<0.5) return '<span class="badge badge-table badge-warning">'+data+'</span>';
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
                                var alertClass = 'alert-info';
                                var detailsContent = '';
                                var rData = row.data();
                                if(row.data()[4] == 'Yes'){
                                    detailsContent = '<strong>DEPRECATED</strong><br/>';
                                    alertClass = 'alert-danger';
                                }
                                detailsContent += row.data()[19] != '' ? '<strong>operationId: </strong>'+ row.data()[19] +'<br/>' : '';
                                detailsContent += row.data()[20] != '' ? '<strong>Summary: </strong>'+ row.data()[20] +'<br/>' : '';
                                detailsContent += row.data()[21] != '' ? '<strong>Description: </strong>'+ row.data()[21] +'<br/>': '';
                                detailsContent += row.data()[22] != '' ? '<strong>Tags: </strong>'+ row.data()[22] : '';
                                row.child( '<div class="alert '+alertClass+'">'+detailsContent+'</div>' ).show();
                            }
                        }
                    }
                }
            }
        };
        this.pages.sws_api = page;
    };


    SWSLayout.prototype.defineApiOpPage = function(options){
        var page = {
            title: 'API Operation Details',
            icon: 'fa-asterisk',
            datevent: 'sws-ondata-apiop',
            getdata: {
                type: "get",
                url: "stats",
                data: { fields: ['apiop'] }
            },
            getfieldsonce:['apidefs','apistats'],
            getdataproc: function(pageId, pageCtx, getDataReq){
                // For apiop field, we need to add parameters path and method
                // Get them from active page context, if specified; if not - ignore; Page Context contains "<METHOD>,<PATH>"
                if((pageId=="sws_apiop") && (pageCtx != null)){
                    var vals = pageCtx.split(',',2);
                    if(vals.length==2){
                        getDataReq.data.method=vals[0];
                        getDataReq.data.path=vals[1];
                    }
                }
                // TODO Optimize: if apidefs already exists, take first one from there
            },
            rows: {
                r0: {
                    class: "sws-row-hdr",
                    columns: {
                        sws_apiop_title : { class:"col-md-4", type: "title"},
                        sws_apiop_opsel : {
                            class:"col-md-8",
                            type: "apiopsel",
                            events: ['sws-onchange-apiop']
                        }
                    }
                },
                r1: {
                    columns: {
                        sws_apiop_wPath : { class:"col-md-12", type: "widget", title:'', subtitle:'', style:'infobox'},
                    }
                },
                r2: {
                    columns: {
                        sws_apiop_wRq  : { class:"col-md-2", type: "widget", title: 'Requests', subtitle:'Total received requests' },
                        sws_apiop_wApd : { class:"col-md-2", type: "widget", title: 'Apdex Score', subtitle:'Overall Apdex Score', postProcess:'successIfNonZero' },
                        sws_apiop_wRRte: { class:"col-md-2", type: "widget", title: 'Req Rate', subtitle:'Overall Req rate', postProcess:'successIfNonZero' },
                        sws_apiop_wERte: { class:"col-md-2", type: "widget", title: 'Err Rate', subtitle:'Overall Err rate', postProcess:'redIfNonZero' },
                        sws_apiop_wAHt : { class:"col-md-2", type: "widget", title: 'Avg HT', subtitle:'Average Handle Time' },
                        sws_apiop_wRrCl: { class:"col-md-2", type: "widget", title: 'Avg Req Payload', subtitle:'Avg req content len' }
                    }
                },
                r3: {
                    columns: {
                        sws_apiop_wErr : { class:"col-md-2", type: "widget", title: 'Errors', subtitle:'Total Error Responses', postProcess:'redIfNonZero' },
                        sws_apiop_wSs  : { class:"col-md-2", type: "widget", title: 'Success', subtitle:'Success Responses', postProcess:'successIfNonZero' },
                        sws_apiop_wRed : { class:"col-md-2", type: "widget", title: 'Redirect', subtitle:'Redirect Responses' },
                        sws_apiop_wCe  : { class:"col-md-2", type: "widget", title: 'Client Error', subtitle:'Client Error Responses', postProcess:'redIfNonZero' },
                        sws_apiop_wSe  : { class:"col-md-2", type: "widget", title: 'Server Error', subtitle:'Server Error Responses', postProcess:'redIfNonZero' },
                        sws_apiop_wReCl: { class:"col-md-2", type: "widget", title: 'Avg Res Payload', subtitle:'Avg res content len' }
                    }
                },

                r4: {
                    columns: {
                        sws_apiop_cHTH  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Handle Time Histogram (msec)', height:"100px",type: 'bar' },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { display: false },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        },
                        sws_apiop_cRqSH  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Request Size Histogram (bytes)', height:"100px", type: 'bar' },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { display: false },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        },
                        sws_apiop_cRsSH  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Response Size Histogram (bytes)', height:"100px", type: 'bar' },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { display: false },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        }
                    }
                },

                r5: {
                    columns: {
                        sws_apiop_cRsC  : {
                            class:"col-lg-4",
                            type: "chart",
                            options: { title:'Response Codes', height:"125px", type: 'doughnut' },
                            chartdata: { labels: [], datasets: [{data:[],backgroundColor:[]}] },
                            chartoptions : {
                                responsive: true,
                                legend: { position: 'right' },
                                animation: { animateScale: true, animateRotate: true }
                            }
                        },
                        sws_apiop_tParams: {
                            class:"col-lg-8",
                            type: "datatable",
                            options: {expand:true,title: 'Parameters'},
                            dataTableSettings:{
                                pageLength: 25,
                                columns: [
                                    {title:'', width:'1%', searchable:false, orderable:false,
                                        class: 'sws-row-expand text-center cursor-pointer',
                                        render:function( data, type, full, meta ) {
                                            return '<i class="fa fa-caret-right">';
                                        }},
                                    {title:'Name', class:'strong'},
                                    {title:'In', class:'strong'},
                                    {title:'Hits', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-info">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Misses', render:function( data, type, full, meta ) {
                                        if(data>0) return '<span class="badge badge-table badge-danger">'+data+'</span>';
                                        return data;
                                    }},
                                    {title:'Type', class:'strong'},
                                    {title:'Format' },
                                    {title:'Required'},
                                    {title:'Description', width:'50%'},
                                ],
                                responsive: true,
                                dom: '<"html5buttons"B>lTfgitp',
                                buttons: ['copy','csv','colvis'],
                                order: [[1, "asc"]]
                            },
                            showDetails: function(row){
                                row.child( '<pre><code class="json">'+row.data()[9]+'</code></pre>' ).show();
                                $('pre code:not(.hljs)').each(function(i, block) {
                                    hljs.highlightBlock(block);
                                });
                            }
                        }
                    }
                }
            }
        };
        this.pages.sws_apiop = page;
    };


/*
<form>
<div class="form-group">
    <input type="email" class="form-control" placeholder="Username" required="">
</div>
<div class="form-group">
    <input type="password" class="form-control" placeholder="Password" required="">
</div>
<button type="submit" class="btn btn-primary block full-width m-b">Login</button>
</form>
*/

    SWSLayout.prototype.defineLoginPage = function(options){
        var page = {
            title: 'Login',
            icon: 'fa-sign-in',
            hidden: true,
            datevent: 'sws-ondata-login',
            getdata: {
                type: "get",
                url: "stats",
                data: {}
            },
            rows: {
                r1: {
                    columns: {
                        sws_login_r1c1 : { class:"col-md-4", type: "empty"},
                        sws_login_r1c2 : { class:"col-md-4", type: "markup",
                            markup: '<div class="sws-logo-xxl">{<i class="fa fa-sign-in"></i>}</div>'
                        },
                        sws_login_r1c3 : { class:"col-md-4", type: "empty"}
                    }
                },
                r2: {
                    columns: {
                        sws_login_r2c1 : { class:"col-md-4", type: "empty"},
                        sws_login_r2c2 : { class:"col-md-4", type: "markup",
                        markup: '<div class="sws-login-msg">Warning</div>\n'+
                        '<form>\n' +
                        '<div class="form-group">\n' +
                        '    <input id="sws-login-username" class="form-control" placeholder="Username" required="">\n' +
                        '</div>\n' +
                        '<div class="form-group">\n' +
                        '    <input id="sws-login-password" type="password" class="form-control" placeholder="Password" required="">\n' +
                        '</div>\n' +
                        '<div id="sws-login-submit" class="btn sws-btn-login">Login</div>\n' +
                        '</form>'
                        },
                        sws_login_r2c3 : { class:"col-md-4", type: "empty"}
                    }
                },
                r3: {
                    columns: {
                        sws_login_r3c1 : { class:"col-md-12", type: "empty"}
                    }
                }
            }
        };
        this.pages.sws_login = page;
    };

};
