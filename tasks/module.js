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
            cleanBuildDir: true
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
        fse.copy(srcDir, buildDir, function(err) {
            if (err) {
                grunt.log.warn(err);
            }
            done();
        });
    });
};
