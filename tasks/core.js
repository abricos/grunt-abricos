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

    // ------------ Abricos Core Builder -------------

    var checkAbricosCore = function(projectDir) {
        var fileModulePhp = path.join(projectDir, 'src', 'index.php');
        var isExists = grunt.file.exists(fileModulePhp);

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
        fse.copy(srcDir, buildDir, function(err) {
            if (err) {
                grunt.log.warn(err);
            }
            done();
        });
    });
};
