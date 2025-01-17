var package = require('./package.json');
var gulp = require('gulp-help')(require('gulp'));
var concat = require('gulp-concat');
var del = require('del');
var dom  = require('gulp-dom');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var zip = require('gulp-zip');

var dist = 'dist';
var base_name = 'icn3d-' + package.version;


gulp.task('clean', 
  'Removes the dist directory, for a clean build',
  function () {
    return del([dist]);
  });

gulp.task('libs', 
  'Copy library files (css and js) into dist/libs',
  ['clean'], 
  function() {
    return gulp.src([
            "node_modules/jquery-ui/themes/ui-lightness/**",
            "node_modules/jquery/dist/jquery.min.js",
            "node_modules/jquery-ui/jquery-ui.min.js",
            "node_modules/three/three.min.js",
        ])
        .pipe(gulp.dest(dist + '/lib'));
  });

gulp.task('copy', 
  'Copies several files as-is into dist, including source css and ' +
  'various metadata files.',
  ['clean'], 
  function () {
    return gulp.src([
            "src/icn3d_simple_ui.css",
            "src/icn3d_full_ui.css",
            'LICENSE',
            'README.md',
            'icn3d.html',
        ])
        .pipe(gulp.dest(dist));
  });

gulp.task('surface', 
  'surface.js is special; push both minified and non-minified into dist',
  ['clean'], 
  function() {
    return gulp.src("src/surface.js")
        .pipe(gulp.dest(dist))
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest(dist));
  });


// Helper function to create a gulp task to concatenate and minify
// simple and full
function make_js_task(name, src) {
    gulp.task("src_js_" + name, 
      'Concat and minify the ' + name + ' javascript',
      ['clean'], 
      function() {
        return gulp.src(src)
            .pipe(concat(name + '_ui_all.js'))
            .pipe(gulp.dest(dist))
            .pipe(uglify())
            .pipe(rename({ extname: '.min.js' }))
            .pipe(gulp.dest(dist));
      });
}

// These source JavaScript files are common to both simple and full
var common_js = [
    "src/Detector.js",
    "src/CanvasRenderer.js",
    "src/TrackballControls.js",
    "src/OrthographicTrackballControls.js",
    "src/Projector.js",
    "src/icn3d.js",
];

// Create the gulp tasks for simple and full:
make_js_task("simple", common_js.concat("src/simple_ui.js"));
make_js_task("full", common_js.concat("src/full_ui.js"));


gulp.task('html', 
  'Rewrite the link and script tags in the html',
  ['clean'], 
  function() {
    return gulp.src(['index.html', 'full.html'])
        .pipe(dom(function() {
            var elems = this.querySelectorAll(
                "script[src],link[rel='stylesheet']");
            for (i = 0; i < elems.length; ++i) {
                var e = elems[i];
                var src_attr = (e.tagName == "SCRIPT") ? "src" : "href";
                var src_file = e.getAttribute(src_attr);

                var new_src, m, 
                    set_attr = true;
                if (m = src_file.match(/^node_modules\/.*\/(.*)/))
                    new_src = "lib/" + m[1];
                else if (m = src_file.match(/^src\/(.*\.css)$/))
                    new_src = m[1];
                else if (src_file == "src/surface.js")
                    new_src = "surface.min.js";
                else if (m = src_file.match(/^src\/(.*_ui)\.js/))
                    new_src = m[1] + "_all.js";
                else {
                    e.parentNode.removeChild(e);
                    set_attr = false;
                }
                if (set_attr) e.setAttribute(src_attr, new_src);
            }
            return this;
        }))
        .pipe(gulp.dest(dist));
  });

gulp.task('zip', 
  'Zip up the dist into icn3d-<version>.zip',
  ['libs', 'copy', 'surface', 
   'src_js_simple', 'src_js_full', 'html'],
  function() {
    return gulp.src('./dist/**')
      .pipe(rename(function(path) {
        path.dirname = base_name + '/' + path.dirname;
      }))
      .pipe(zip(base_name + '.zip'))
      .pipe(gulp.dest('dist'));
  });


gulp.task('default', 
  'The default task runs everything',
  ['zip']
);

