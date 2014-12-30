/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var async = require('async');
var merge = require("merge");
var path = require('path');

var Config = require('./utils/Config');
var PHPManager = require('./entity/PHPManager');
var AssetsManager = require('./entity/AssetsManager');
var logHelper = require('./utils/loghelper');

var UTF8 = 'utf-8';

var Framework = function(options){

    options = merge({
        directory: process.cwd()
    }, options || {});

    var config = Config.instance('framework', {
        directory: options.directory,
        build: {
            dir: '.'
        },
        source: {
            dir: 'src'
        },
        log: {
            console: {
                label: 'framework'
            }
        }
    });
    this.config = config;

    var logger = this.logger();

    var srcDir = config.pathResolve('directory', 'source.dir', true);
    var buildDir = config.pathResolve('^.build.dir', 'build.dir', true);

    logger.debug('souce dir %s', logHelper.path(srcDir));
    logger.debug('build dir %s', logHelper.path(buildDir));

    logger.debug('start PHPManager initialization');
    try {
        this.phpManager = new PHPManager({
            parentConfig: config
        });
    } catch (e) {
        logger.error('initializing PHPManager, message=`' + e.message + '`');
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
Framework.prototype = {
    logger: function(){
        return this.config.logger();
    },

    build: function(callback){
        var instance = this;

        var stack = [
            function(stackCallback){
                instance.phpManager.build(stackCallback);
            },
            function(stackCallback){
                instance.assetsManager.build(stackCallback);
            }
        ];

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    },

    info: function(callback){
        var logger = this.logger(),
            config = this.config,
            instance = this;

        var version = config.get('package.version');

        logger.info('version %s', logHelper.string(version));

        var stack = [
            function(stackCallback){
                instance.phpManager.info(stackCallback);
            },
            function(stackCallback){
                instance.assetsManager.info(stackCallback);
            }
        ];

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    }
};

module.exports = Framework;
