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
var fs = require('fs');
var async = require('async');
var glob = require('glob');
var mout = require('mout');
var bower = require('bower');

module.exports = function(grunt) {


    // ------------ Abricos Vendor Builder -------------

    var bowerJSONRead = function(projectDir) {
        var bowerJsonFile = path.join(projectDir, 'bower.json');

        if (!grunt.file.exists(bowerJsonFile)) {
            grunt.log.warn('Bower.json in "' + projectDir + '" not found.');
            return;
        }

        var bowerJson = grunt.file.readJSON(bowerJsonFile);
        if (!bowerJson) {
            grunt.log.warn('Error form in "' + bowerJsonFile + '".');
            return;
        }

        return bowerJson;
    };

    var vendorJSONRead = function(projectDir) {
        var vendorJsonFile = path.join(projectDir, 'vendor.json');

        if (!grunt.file.exists(vendorJsonFile)) {
            return {'files': {}};
        }

        var json = grunt.file.readJSON(vendorJsonFile);

        if (!json) {
            json = {'files': {}};
        }
        json.files = json.files || {};

        return json;
    };

    var buildFilesForCopy = function(srcDir, destDir, pattern) {

        if (mout.lang.isObject(pattern)) {
            var obj = pattern;
            srcDir = path.resolve(srcDir, obj.cwd || '');
            destDir = path.resolve(destDir, obj.dest || '');

            pattern = obj.src || '**/*';
        }

        var globFiles = glob.sync(path.join(srcDir, pattern));
        var filesToCopy = [];
        var fileSrc;
        var relFile;
        var fileDest;

        for (var i = 0; i < globFiles.length; i++) {
            fileSrc = globFiles[i];
            relFile = path.relative(srcDir, fileSrc);
            fileDest = path.join(destDir, relFile);

            filesToCopy.push([fileSrc, fileDest]);
        }
        return filesToCopy;
    };

    var copyFiles = function(srcDir, destDir, pattern, callback) {
        destDir = path.join(destDir, '/');
        pattern = pattern || '**/*';

        var filesToCopy = [];
        var i;

        if (mout.lang.isArray(pattern)) {
            for (i = 0; i < pattern.length; i++) {
                var files = buildFilesForCopy(srcDir, destDir, pattern[i]);
                mout.array.append(filesToCopy, files);
            }
        } else {
            filesToCopy = buildFilesForCopy(srcDir, destDir, pattern);
        }

        var srcFile;
        var destFile;

        for (i = 0; i < filesToCopy.length; i++) {
            srcFile = filesToCopy[i][0];
            destFile = filesToCopy[i][1];

            if (fs.statSync(srcFile).isFile()) {
                grunt.file.copy(srcFile, destFile);
            }
        }

        callback();
    };

    var vendorInstall = function(projectDir, callback) {
        var bowerJsonFile = path.join(projectDir, 'bower.json');

        if (!grunt.file.exists(bowerJsonFile)) {
            return;
        }

        bower.commands.install([], {}, {
            cwd: projectDir
        }).on('end', function() {
            grunt.log.writeln(['bower install'].join(' '));
            callback(null);
        }).on('error', function(error) {
            grunt.fail.fatal(error);
            callback(error);
        });
    };

    var vendorBuild = function(projectDir, buildDir, callback) {
        buildDir = path.resolve(projectDir, buildDir);
        var componentsDir = path.join(projectDir, 'bower_components');

        var bowerJson = bowerJSONRead(projectDir);
        if (!bowerJson) {
            return callback();
        }

        var vendorJson = vendorJSONRead(projectDir);

        var stack = [];

        var dependencies = bowerJson.dependencies;

        for (var vendorName in dependencies) {
            if (dependencies.hasOwnProperty(vendorName)) {
                (function(vendorName) {
                    var vendorSrc = path.join(componentsDir, vendorName);
                    var vendorDest = path.join(buildDir, vendorName);

                    stack.push(function(stackCallback) {
                        copyFiles(vendorSrc, vendorDest, vendorJson.files[vendorName], stackCallback);
                    });

                })(vendorName);
            }
        }

        async.parallelLimit(stack, 3, function(err) {
            if (callback) {
                callback(err);
            }
        });
    };

    grunt.registerMultiTask('abvendor', 'Build Abricos Vendors', function() {
        var options = this.options({
            directory: process.cwd(),
            buildDir: 'build/vendor',
            cleanBuildDir: true,
            install: true
        });

        var projectDir = path.resolve(options.directory);

        var stack = [];

        if (options.install !== false) {
            stack.push(function(stackCallback) {
                vendorInstall(projectDir, function(err) {
                    stackCallback(err);
                });
            });
        }
        stack.push(function(stackCallback) {
            vendorBuild(projectDir, options.buildDir, function(err) {
                stackCallback(err);
            });
        });

        var done = this.async();
        async.series(stack, function(err) {
            if (err) {
                done(false);
            } else {
                done();
            }
        });
    });
};
