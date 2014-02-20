/*
 * grunt-abricos
 * https://github.com/roosit/grunt-abricos
 *
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var path = require('path');
var fse = require('fs-extra');
var async = require('async');
var less = require('less');
var chalk = require('chalk');
var glob = require('glob');

var lessOptions = {
    parse: ['paths', 'optimization', 'filename', 'strictImports', 'syncImport', 'dumpLineNumbers', 'relativeUrls', 'rootpath'],
    render: ['compress', 'cleancss', 'ieCompat', 'strictMath', 'strictUnits',
        'sourceMap', 'sourceMapFilename', 'sourceMapURL', 'sourceMapBasepath', 'sourceMapRootpath', 'outputSourceFiles']
};

module.exports = function(grunt) {

    // ------------ Abricos Module Builder -------------

    var checkAbricosModule = function(projectDir) {
        var fileModulePhp = path.join(projectDir, 'src', 'module.php');
        var isExists = grunt.file.exists(fileModulePhp);

        return isExists;
    };

    grunt.registerMultiTask('abmodule', 'Build Abricos Module', function() {

        var options = this.options({
            directory: process.cwd(),
            buildDir: 'build',
            cleanBuildDir: true,
            lessOptions: {}
        });

        var projectDir = options.directory;

        var isModule = checkAbricosModule(projectDir);
        if (!isModule) {
            grunt.log.warn('Abricos module "' + projectDir + '" not found.');
            return;
        }

        var srcDir = path.resolve(projectDir, 'src');
        var buildDir = path.resolve(projectDir, options.buildDir);

        if (options.cleanBuildDir && grunt.file.exists(buildDir)) {
            // Clean build directory
            grunt.file.delete(buildDir);
        }

        var done = this.async();
        var stack = [];

        // LESS
        var lessSrcDir = path.join(srcDir, 'less');
        var lessDestDir = path.join(srcDir, 'css');

        if (grunt.file.isDir(lessSrcDir)){

            var lessGlobFiles = glob.sync(path.join(lessSrcDir, '*.less'));

            for (var i = 0; i < lessGlobFiles.length; i++) {
                var lessFileSrc = lessGlobFiles[i];
                var cssFileName = path.basename(lessFileSrc, '.less') + '.css';
                var lessFileDest = path.join(lessDestDir, cssFileName);

                (function lessFileCompile (lessFileSrc, lessFileDest){
                    stack.push(function(stackCallback){
                        compileLess(lessFileSrc, options.lessOptions, function(err, css) {
                            if (!err) {
                                grunt.file.write(lessFileDest, css);
                                grunt.log.writeln('File ' + chalk.cyan(lessFileDest) + ' created.');
                            }
                            stackCallback(err);
                        });
                    });
                })(lessFileSrc, lessFileDest);
            }
        }

        // copy
        stack.push(function(stackCallback) {
            fse.copy(srcDir, buildDir, function(err) {
                if (err) {
                    grunt.log.warn(err);
                }
                stackCallback(err);
            });
        });

        async.series(stack, function(err) {
            if (err) {
                done(false);
            } else {
                done();
            }
        });
    });

    // Used by grunt-contrib-less (https://github.com/gruntjs/grunt-contrib-less)
    var compileLess = function(srcFile, options, callback){
        options = grunt.util._.extend({filename: srcFile}, options);
        options.paths = options.paths || [path.dirname(srcFile)];

        var srcCode = grunt.file.read(srcFile);

        var parser = new less.Parser(grunt.util._.pick(options, lessOptions.parse));

        parser.parse(srcCode, function(parse_err, tree) {
            if (parse_err) {
                lessError(parse_err, srcFile);
                return callback(true, '');
            }

            var css = tree.toCSS();

            return callback(null, css);
        });
    };

    var formatLessError = function(e) {
        var pos = '[' + 'L' + e.line + ':' + ('C' + e.column) + ']';
        return e.filename + ': ' + pos + ' ' + e.message;
    };

    var lessError = function(e, file) {
        var message = less.formatError ? less.formatError(e) : formatLessError(e);

        grunt.log.error(message);
        grunt.fail.warn('Error compiling ' + file);
    };

};
