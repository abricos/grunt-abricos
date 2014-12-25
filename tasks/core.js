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
var fse = require('fs-extra');
var async = require('async');

module.exports = function(grunt) {

    // ------------ Abricos Core Builder -------------

    var checkAbricosCore = function(projectDir) {
        var fileModulePhp = path.join(projectDir, 'src', 'index.php');
        var isExists = fs.existsSync(fileModulePhp);

        return isExists;
    };

    grunt.registerMultiTask('abcore', 'Build Abricos Core', function() {
        var options = this.options({
            directory: process.cwd(),
            buildDir: 'build'
        });

        var projectDir = options.directory;

        var isModule = checkAbricosCore(projectDir);
        if (!isModule) {
            grunt.log.warn('Abricos core "' + projectDir + '" not found.');
            return;
        }

        var srcDir = path.resolve(projectDir, 'src');
        var buildDir = path.resolve(projectDir, options.buildDir);

        var done = this.async();
        var stack = [];

        // LESS
        stack.push(function (stackCallback) {
            var lessSrcDir = path.join(srcDir, 'tt/default/less');
            var lessDestDir = path.join(buildDir, 'tt/default/css');
            less(grunt, lessSrcDir, lessDestDir, options, stackCallback);
        });

        // copy
        stack.push(function(stackCallback){
            fse.copySync(srcDir, buildDir);
            stackCallback(null);
        });

        // Delete work files
        stack.push(function (stackCallback) {
            var lessDestDir = path.join(buildDir, 'tt/default/less');
            fse.removeSync(lessDestDir);

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
