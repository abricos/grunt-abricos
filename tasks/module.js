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
var glob = require('glob');

var less = require('../lib/less.js');

module.exports = function (grunt) {

    // ------------ Abricos Module Builder -------------

    var checkAbricosModule = function (projectDir) {
        var fileModulePhp = path.join(projectDir, 'src', 'module.php');
        var isExists = grunt.file.exists(fileModulePhp);

        return isExists;
    };

    grunt.registerMultiTask('abmodule', 'Build Abricos Module', function () {

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
        stack.push(function (stackCallback) {
            var lessSrcDir = path.join(srcDir, 'less');
            var lessDestDir = path.join(buildDir, 'css');
            less(grunt, lessSrcDir, lessDestDir, options, stackCallback);
        });

        // LESS in Components
        stack.push(function (stackCallback) {
            var lessSrcDir = path.join(srcDir, 'js');
            var lessDestDir = path.join(buildDir, 'js');
            less(grunt, lessSrcDir, lessDestDir, options, stackCallback);
        });

        // JS Components

        // copy
        stack.push(function (stackCallback) {
            fse.copy(srcDir, buildDir, function (err) {
                if (err) {
                    grunt.log.warn(err);
                }
                stackCallback(err);
            });
        });

        // Delete work files
        stack.push(function (stackCallback) {

            var lessDestDir = path.join(buildDir, 'less');
            grunt.file.delete(lessDestDir);

            var globFiles = glob.sync(path.join(buildDir, 'js/*.less'));
            for (var i = 0; i < globFiles.length; i++){
                var file = globFiles[i];
                grunt.file.delete(file);
            }

            stackCallback(null);
        });

        async.series(stack, function (err) {
            if (err) {
                done(false);
            } else {
                done();
            }
        });
    });
};
