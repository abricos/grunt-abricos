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
        dir: 'vendor'
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

    config.pathResolve('^.source.dir', 'source.dir', true);
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

    build: function(callback){
        callback = callback || function(){
        };

        var logger = this.logger(),
            config = this.config,
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        if (!fs.existsSync(srcDir)){
            return callback();
        }

        fse.ensureDirSync(buildDir);

        logger.debug('start build');

        fse.copy(srcDir, buildDir, function(err){
            return callback(err);
        });
    },

    info: function(callback, isDebug){
        callback = callback || function(){
        };

        var logger = this.logger(),
            config = this.config,
            directory = config.get('directory'),
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir'),
            vendor = config.get('abricos.vendor');

        var level = isDebug ? 'debug' : 'info';

        logger[level]('directory %s', logHelper.path(directory));
        logger[level]('souce dir %s', logHelper.path(srcDir));
        logger[level]('build dir %s', logHelper.path(buildDir));

        if (vendor){
            for (var name in vendor){
                var info = vendor[name];
                logger.info(
                    'vendor %s, endpoint=%s, build=%s',
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
