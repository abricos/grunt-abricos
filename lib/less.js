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
var async = require('async');
var glob = require('glob');
var chalk = require('chalk');
var less = require('less');

var lessOptions = {
    parse: ['paths', 'optimization', 'filename', 'strictImports', 'syncImport', 'dumpLineNumbers', 'relativeUrls', 'rootpath'],
    render: ['compress', 'cleancss', 'ieCompat', 'strictMath', 'strictUnits',
        'sourceMap', 'sourceMapFilename', 'sourceMapURL', 'sourceMapBasepath', 'sourceMapRootpath', 'outputSourceFiles']
};

module.exports = function (grunt, srcDir, dstDir, options, callback) {

    if (!grunt.file.isDir(srcDir)) {
        return callback();
    }

    var stack = [];

    var lessGlobFiles = glob.sync(path.join(srcDir, '*.less'));

    for (var i = 0; i < lessGlobFiles.length; i++) {
        var lessFileSrc = lessGlobFiles[i];
        var cssFileName = path.basename(lessFileSrc, '.less') + '.css';
        var lessFileDest = path.join(dstDir, cssFileName);

        (function lessFileCompile(lessFileSrc, lessFileDest) {
            stack.push(function (stackCallback) {
                compileLess(grunt, lessFileSrc, options.lessOptions, function (err, css) {
                    if (!err) {
                        grunt.file.write(lessFileDest, css);
                        // grunt.log.writeln('File ' + chalk.cyan(lessFileDest) + ' created.');
                    }
                    stackCallback(err);
                });
            });
        })(lessFileSrc, lessFileDest);
    }

    async.series(stack, function (err) {
        callback(err);
    });
};


// Used by grunt-contrib-less (https://github.com/gruntjs/grunt-contrib-less)
var compileLess = function (grunt, srcFile, options, callback) {
    options = grunt.util._.extend({filename: srcFile}, options);
    options.paths = options.paths || [path.dirname(srcFile)];

    options = grunt.util._.pick(options, lessOptions.parse)

    var srcCode = grunt.file.read(srcFile);

    less.render(srcCode, options, function(err, output){
        if (err) {
            lessError(err, grunt, srcFile);
            return callback(true, '');
        }

        return callback(null, output.css);
    });
};

var formatLessError = function (e) {
    var pos = '[' + 'L' + e.line + ':' + ('C' + e.column) + ']';
    return e.filename + ': ' + pos + ' ' + e.message;
};

var lessError = function (e, grunt, file) {
    var message = less.formatError ? less.formatError(e) : formatLessError(e);

    grunt.log.error(message);
    grunt.fail.warn('Error compiling ' + file);
};
