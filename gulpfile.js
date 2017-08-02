var gulp = require('gulp'),
    gp_concat = require('gulp-concat'),
    gp_rename = require('gulp-rename'),
    gp_uglify = require('gulp-uglify');
gp_minify = require('gulp-minify');
gp_sourcemaps = require('gulp-sourcemaps');
cssBase64 = require('gulp-css-base64');
cleanCSS = require('gulp-clean-css');
concatCSS = require('gulp-concat-css');

var jsFiles = [
    "./node_modules/jquery/dist/jquery.min.js",
    "./node_modules/bootstrap/dist/js/bootstrap.min.js",
    "./ui/plugins/datatables/datatables.min.js",
    "./node_modules/chart.js/dist/Chart.bundle.min.js",
    "./node_modules/moment/min/moment.min.js",
    "./ui/plugins/highlightjs/highlight.pack.js",
    "./ui/plugins/peity/jquery.peity.min.js",
    //"./ui/plugins/d3/d3.min.js",
    //"./ui/plugins/cubism/cubism.v1.js",
    "./node_modules/chosen-js/chosen.jquery.js",
    "./ui/swsLayout.js",
    "./ui/swsTable.js",
    "./ui/swsuiWidget.js",
    "./ui/swsuiChart.js",
    "./ui/swsApiOpSel.js",
    "./ui/sws.js"
];

var cssFiles = [
    "./node_modules/bootstrap/dist/css/bootstrap.min.css",
    "./node_modules/font-awesome/css/font-awesome.min.css",
    "./ui/plugins/datatables/datatables.min.css",
    "./ui/plugins/highlightjs/github.css",
    "./node_modules/chosen-js/b64-chosen.css",
    "./ui/css/sws.css"
];

var cssFilesBase64 = [
    "./node_modules/chosen-js/chosen.css"
];

var fontFiles = [
    "./node_modules/bootstrap/dist/fonts/*.*",
    "./node_modules/font-awesome/fonts/*.*"
];

gulp.task('js-build', function(){
    return gulp.src(jsFiles)
        .pipe(gp_sourcemaps.init())
        .pipe(gp_concat('sws.js'))
        .pipe(gp_uglify())
        .pipe(gp_rename('sws.min.js'))
        .pipe(gp_sourcemaps.write('../maps'))
        .pipe(gulp.dest('dist/js/'));
});

gulp.task('css-base64', function(){
    return gulp.src(cssFilesBase64)
        .pipe(cssBase64())
        .pipe(gp_rename({prefix: "b64-"}))
        .pipe(gulp.dest(function(file) {
            return file.base;
        }));
});

gulp.task('css-build', ['css-base64'], function(){
    return gulp.src(cssFiles)
        .pipe(gp_sourcemaps.init())
        .pipe(concatCSS('sws.min.css', {rebaseUrls: false}))
        .pipe(cleanCSS())
        .pipe(gp_sourcemaps.write('../maps'))
        .pipe(gulp.dest('dist/css/'));
});

gulp.task('fonts', function() {
    return gulp.src(fontFiles)
        .pipe(gulp.dest('dist/fonts/'));
});

gulp.task('default', ['fonts','css-build','js-build'], function(){});
