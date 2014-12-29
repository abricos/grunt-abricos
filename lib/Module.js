/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var async = require('async');
var merge = require("merge");

var Config = require('./utils/Config');
var PHPManager = require('./entity/PHPManager');
var JSManager = require('./entity/JSManager');
var AssetsManager = require('./entity/AssetsManager');

var UTF8 = 'utf-8';

var Module = function(options){

    options = merge.recursive(true, {
        directory: process.cwd()
    }, options || {});

    var configId = Config.genid('module_');
    var config = Config.instance(configId, {
        directory: options.directory,
        build: {
            dir: 'modules/<%= abricos.name %>'
        },
        source: {
            dir: 'src'
        },
        log: {
            console: {
                label: '<%= abricos.name %>'
            }
        }
    });

    this.config = config;

    var logger = this.logger();

    config.pathResolve('directory', 'source.dir', true);
    config.pathResolve('^.build.dir', 'build.dir', true);

    logger.debug('start PHPManager initialization');
    try {
        this.phpManager = new PHPManager({
            parentConfig: config
        });
    } catch (e) {
        logger.error('initializing PHPManager, message=`' + e.message + '`');
    }

    logger.debug('start JSManager initialization');
    try {
        this.jsManager = new JSManager({
            parentConfig: config
        });
    } catch (e) {
        logger.error('initializing JSManager, message=`' + e.message + '`');
    }

    this.logger().debug('start AssetsManager initialization');
    try {
        this.assetsManager = new AssetsManager({
            parentConfig: config
        });
    } catch (e) {
        logger.error('initializing AssetsManager, message=`' + e.message + '`');
    }

    logger.debug('initialized');
};
Module.prototype = {
    logger: function(){
        return this.config.logger();
    },

    jsBuild: function(callback){
        var stack = [], instance = this;

        stack.push(function(stackCallback){
            instance.jsManager.build(stackCallback);
        });
        stack.push(function(stackCallback){
            instance.jsManager.minify(stackCallback);
        });

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    },

    build: function(callback){
        var stack = [], instance = this;

        stack.push(function(stackCallback){
            instance.phpManager.build(stackCallback);
        });

        stack.push(function(stackCallback){
            instance.assetsManager.build(stackCallback);
        });

        stack.push(function(stackCallback){
            instance.jsBuild(stackCallback);
        });

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    }
};

module.exports = Module;
