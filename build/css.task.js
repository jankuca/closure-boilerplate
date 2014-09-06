var async = require('async');
var autoprefixer = require('autoprefixer');
var fs = require('fs');
var path = require('path');
var rework = require('rework');

var rework_at2x = require('rework-plugin-at2x');
var rework_calc = require('rework-calc');
var rework_colors = require('rework-plugin-colors');
var rework_ease = require('rework-plugin-ease');
var rework_inherit = require('rework-inherit');
var rework_references = require('rework-plugin-references');
var rework_svg = require('rework-svg');
var rework_url = require('rework-plugin-url');


module.exports = function (runner, args, callback) {
  var rework_flags = {
    autoprefixer: runner.getAppConfigValue('css.autoprefixer'),
    at2x: !!runner.getAppConfigValue('css.at2x'),
    colors: !!runner.getAppConfigValue('css.colors'),
    extend: !!runner.getAppConfigValue('css.inheritance'),
    ease: !!runner.getAppConfigValue('css.ease'),
    references: !!runner.getAppConfigValue('css.references')
  };

  var minify = !!runner.getAppConfigValue('css.minify');


  async.waterfall([
    function (callback) {
      var project_dirname = runner.getProjectDirname();
      var groups = runner.getAppConfigValue('css') || {};
      var targets = Object.keys(groups);

      var onTarget = function (target, callback) {
        var target_filename = path.join(project_dirname, target);

        var css_files = groups[target] || [];
        var css_code = '';

        css_files.forEach(function (file) {
          var filename = path.join(project_dirname, file);
          var css_part_code = fs.readFileSync(filename, 'utf8');
          var css_part = rework(css_part_code);

          var filename_rel_to_target = path.relative(
            path.dirname(target_filename),
            path.dirname(filename)
          );

          var fixUrl = function (url) {
            if (url[0] === '.') {
              var url_rel_to_target = path.join(filename_rel_to_target, url);
              return url_rel_to_target;
            }
            return url;
          };
          css_part.use(rework_url(fixUrl));

          css_code += css_part.toString();
        });

        var css = rework(css_code);
        css.use(rework_svg(path.dirname(target)));
        if (rework_flags.autoprefixer) {
          css.use(rework_autoprefixer(rework_flags.autoprefixer).rework);
        }
        if (rework_flags.at2x) {
          css.use(rework_at2x());
        }
        if (rework_flags.colors) {
          css.use(rework_colors());
        }
        if (rework_flags.extend) {
          css.use(rework_inherit());
        }
        if (rework_flags.ease) {
          css.use(rework_ease());
        }
        if (rework_flags.references) {
          css.use(rework_references());
        }

        var css_result = css.toString({
          compress: minify
        });

        fs.writeFile(target_filename, css_result, callback);
      };

      async.forEachSeries(targets, onTarget, callback);
    }

  ], callback);
};
