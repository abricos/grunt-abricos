/*
 * grunt-abricos
 * https://github.com/roosit/grunt-abricos
 *
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var async = require('async');
var path = require('path');
var fse = require('fs-extra');
var fs = require('fs');

module.exports = function (grunt) {

    // ------------ Abricos Template Builder -------------

    var checkAbricosTemplate = function (projectDir) {
        var mainFile = path.join(projectDir, 'src', 'main.html');
        var isExists = grunt.file.exists(mainFile);

        return isExists;
    };

    grunt.registerMultiTask('abtemplate', 'Build Abricos Template', function () {

        var options = this.options({
            directory: process.cwd(),
            buildDir: 'build',
            cleanBuildDir: true
        });

        var projectDir = options.directory;

        var isModule = checkAbricosTemplate(projectDir);
        if (!isModule) {
            grunt.log.warn('Abricos template "' + projectDir + '" not found.');
            return;
        }

        var srcDir = path.join(projectDir, 'src');
        var buildDir = path.resolve(projectDir, options.buildDir);

        if (options.cleanBuildDir && fs.exists(buildDir)) {
            // Clean build directory
            fse.removeSync(buildDir);
        }

        var done = this.async();
        var stack = [];

        // LESS
        stack.push(function (stackCallback) {
            var lessSrcDir = path.join(srcDir, 'less');
            var lessDestDir = path.join(buildDir, 'css');
            less(grunt, lessSrcDir, lessDestDir, options, stackCallback);
        });

        // copy
        stack.push(function (stackCallback) {
            fse.copySync(srcDir, buildDir);
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
