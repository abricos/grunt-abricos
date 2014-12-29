/*
 * grunt-abricos
 * https://github.com/roosit/grunt-abricos
 *
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var Framework = require('../lib/Framework');
var Config = require('../lib/utils/Config');
var logHelper = require('../lib/utils/loghelper');

module.exports = function(grunt){
    grunt.registerMultiTask('abcore', 'Build Abricos Framework', function(){

        var options = this.options();
        var config = Config.instance();

        var logger = config.logger();
        logger.info('start framework build');

        var framework;
        try {
            framework = new Framework(options);
        } catch (e) {
            logger.error('initialize framework, message=%s', logHelper.string(e.message));
            return;
        }

        var done = this.async();
        framework.build(function(err){
            done(err);
        });

        return; ////////////////////////////////

        var srcDir = path.resolve(projectDir, 'src');
        var buildDir = path.resolve(projectDir, options.buildDir);


        var done = this.async();
        var stack = [];

        // LESS
        stack.push(function(stackCallback){
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
        stack.push(function(stackCallback){
            var lessDestDir = path.join(buildDir, 'tt/default/less');
            fse.removeSync(lessDestDir);

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
