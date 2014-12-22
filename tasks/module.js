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
var fs = require('fs');
var async = require('async');
var glob = require('glob');

var less = require('../lib/less.js');
var jscomp = require('../lib/jscomp.js');

module.exports = function(grunt){

    // ------------ Abricos Module Builder -------------

    var checkAbricosModule = function(projectDir){
        var fileModulePhp = path.join(projectDir, 'src', 'module.php');
        var isExists = grunt.file.exists(fileModulePhp);

        return isExists;
    };

    grunt.registerMultiTask('abmodule', 'Build Abricos Module', function(){

        var options = this.options({
            directory: process.cwd(),
            buildDir: 'build',
            cleanBuildDir: true,
            lessOptions: {}
        });

        var projectDir = options.directory;

        var isModule = checkAbricosModule(projectDir);
        if (!isModule){
            grunt.log.warn('Abricos module "' + projectDir + '" not found.');
            return;
        }

        var srcDir = path.resolve(projectDir, 'src');
        var buildDir = path.resolve(projectDir, options.buildDir);

        if (options.cleanBuildDir && fs.existsSync(buildDir)){
            // Clean build directory
            fse.removeSync(buildDir);
        }

        var done = this.async();
        var stack = [];

        // JS Component
        stack.push(function(stackCallback){
            jscomp(grunt, options, stackCallback);
        });

        // LESS
        stack.push(function(stackCallback){
            var lessSrcDir = path.join(srcDir, 'less');
            var lessDestDir = path.join(buildDir, 'css');
            less(grunt, lessSrcDir, lessDestDir, options, stackCallback);
        });

        // copy
        stack.push(function(stackCallback){
            fse.copySync(srcDir, buildDir);
            stackCallback(null);
        });

        // Delete work files
        stack.push(function(stackCallback){

            var lessDestDir = path.join(buildDir, 'less');
            fse.removeSync(lessDestDir);

            var globFiles = glob.sync(path.join(buildDir, 'js/*.less'));
            for (var i = 0; i < globFiles.length; i++){
                var file = globFiles[i];
                fse.removeSync(file);
            }

            stackCallback(null);
        });

        async.series(stack, function(err){
            if (err){
                done(false);
            } else {
                done();
            }
        });
    });
};
