/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var glob = require('glob');
var async = require('async');
var merge = require('merge');
var bower = require('bower');

var logHelper = require('../utils/loghelper');
var Config = require('../utils/Config');

var UTF8 = 'utf-8';
var DEFAULT_OPTIONS = {
    source: {
        bower: {
            'dir': 'bower_components'
        },
        local: {
            dir: 'vendor'
        }
    },
    build: {
        dir: 'vendor'
    },
    init: {
        dir: ''
    },
    log: {
        console: {
            label: '<%= ^.log.console.label %>.Vendor'
        }
    }
};

var VendorManager = function(parentConfig, options){

    if (!parentConfig){
        throw new Error('`parentConfig` not set in VendorManager');
    }

    options = merge.recursive(true, DEFAULT_OPTIONS, options || {})

    var configId = [parentConfig.id, "vendor"].join(".");
    var config = Config.instance(configId, options);
    this.config = config;

    config.pathResolve('^.directory', 'source.local.dir', true);
    config.pathResolve('^.directory', 'source.bower.dir', true);
    config.pathResolve('^.build.dir', 'build.dir', true);
};
VendorManager.prototype = {
    logger: function(){
        return this.config.logger();
    },

    init: function(callback){
        callback = callback || function(){
        };

        var logger = this.logger(),
            config = this.config,
            directory = config.get('directory'),
            vendor = config.get('abricos.vendor');

        if (!vendor){
            return callback();
        }

        var deps = [];
        for (var name in vendor){
            var info = vendor[name];
            deps[deps.length] = name + '#' + info.endpoint;
        }

        if (deps.length === 0){
            return callback();
        }

        this.info(null, true);

        logger.debug('bower: working directory %s', logHelper.path(directory));

        bower.commands.install(deps, {}, {
            cwd: directory
        }).on('log', function(result){
            logger.debug('bower: %s', result.message);
            // grunt.log.writeln(['bower', result.id.cyan, result.message].join(' '));
        }).on('end', function(){
            logger.info('bower: installation is complete');
            callback(null);
        }).on('error', function(error){
            logger.error('bower: %s', error.message);
            callback(error);
        });
    },

    _copyFiles: function(srcDir, buildDir, rule){
        if (typeof rule !== 'string'){
            return;
        }

        var logger = this.logger(),
            files = glob.sync(path.join(srcDir, rule)),
            file,
            destFile,
            destDir;

        for (var i = 0; i < files.length; i++){
            var file = files[i];
            var destFile = path.join(buildDir, path.relative(srcDir, files[i]));
            var destDir = path.dirname(destFile);
            fse.ensureDirSync(destDir);
            fse.copySync(file, destFile);
        }
    },

    _buildBowerVendor: function(name, buildRule, callback){
        var logger = this.logger(),
            config = this.config,
            instance = this,
            srcBowerDir = config.get('source.bower.dir'),
            srcDir = path.join(srcBowerDir, name),
            bowerJSONFile = path.join(srcDir, '.bower.json'),
            buildDir = config.get('build.dir'),
            buildVendorDir = path.join(buildDir, name);

        logger.debug('build %s', logHelper.string(name));

        var stack = [];
        if (!fs.existsSync(bowerJSONFile)){
            logger.debug('bower vendor not install');
            stack.push(function(stackCallback){
                instance.init(function(err){
                    stackCallback(err);
                });
            });
        }

        stack.push(function(stackCallback){
            // logger.debug('clean %s', logHelper.path(buildVendorDir));
            // fse.removeSync(buildVendorDir);
            instance._copyFiles(srcDir, buildVendorDir, buildRule);
            stackCallback();
        });

        async.series(stack, function(err){
            return callback(err);
        });
    },

    build: function(callback){
        callback = callback || function(){
        };

        var logger = this.logger(),
            config = this.config,
            vendors = config.get('abricos.vendor'),
            instance = this;

        var stack = [];

        logger.debug('start build');

        this.info(null, true);

        for (var name in vendors){
            (function(vendorName, buildRule){
                stack.push(function(stackCallback){
                    instance._buildBowerVendor(vendorName, buildRule, function(err){
                        stackCallback(err);
                    });
                });
            })(name, vendors[name].build);
        }

        async.series(stack, function(err){
            return callback(err);
        });

        /*
         if (!fs.existsSync(srcDir)){
         return callback();
         }


         // logger.debug('start build');

         fse.copySync(srcDir, buildDir);
         return callback(err);
         /**/
    },

    info: function(callback, isDebug){
        callback = callback || function(){
        };

        var logger = this.logger(),
            config = this.config,
            directory = config.get('directory'),
            srcLocalDir = config.get('source.local.dir'),
            srcBowerDir = config.get('source.bower.dir'),
            buildDir = config.get('build.dir'),
            vendors = config.get('abricos.vendor');

        var level = isDebug ? 'debug' : 'info';

        logger[level]('directory %s', logHelper.path(directory));
        logger[level]('souce local dir %s', logHelper.path(srcLocalDir));
        logger[level]('souce bower dir %s', logHelper.path(srcBowerDir));
        logger[level]('build dir %s', logHelper.path(buildDir));

        if (vendors){
            for (var name in vendors){
                var info = vendors[name];
                logger[level](
                    'found vendor %s, endpoint=%s, build=%s',
                    logHelper.string(name),
                    logHelper.string(info.endpoint),
                    logHelper.string(info.build)
                );
            }
        }

        return callback();
    }
};

module.exports = VendorManager;