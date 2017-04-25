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
    "./ui/plugins/jquery/jquery.min.js",
    "./ui/plugins/bootstrap/js/bootstrap.min.js",
    "./ui/plugins/datatables/datatables.min.js",
    "./ui/plugins/chart.js/Chart.bundle.min.js",
    "./ui/plugins/moment/moment-with-locales.min.js",
    "./ui/plugins/highlightjs/highlight.pack.js",
    "./ui/plugins/d3/d3.min.js",
    "./ui/plugins/cubism/cubism.v1.js",
    "./ui/plugins/chosen/chosen.jquery.min.js",
    "./ui/swsLayout.js",
    "./ui/swsTable.js",
    "./ui/swsuiTables.js",
    "./ui/swsuiWidget.js",
    "./ui/swsuiChart.js",
    "./ui/swsCubism.js",
    "./ui/swsApiOpSel.js",
    "./ui/sws.js"
];

var cssFiles = [
    "./ui/plugins/bootstrap/css/bootstrap.min.css",
    "./ui/plugins/font-awesome/css/font-awesome.min.css",
    "./ui/plugins/datatables/datatables.min.css",
    "./ui/plugins/animate/animate.css",
    "./ui/plugins/highlightjs/github.css",
    "./ui/plugins/chosen/b64-chosen.min.css",
    "./ui/css/sws.css"
];

var cssFilesBase64 = [
    "./ui/plugins/chosen/chosen.min.css"
];

var fontFiles = [
    "./ui/plugins/bootstrap/fonts/*.*",
    "./ui/plugins/font-awesome/fonts/*.*"
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
