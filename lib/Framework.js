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
var VendorManager = require('./entity/VendorManager');
var logHelper = require('./utils/loghelper');

var UTF8 = 'utf-8';

var DEFAULT_OPTIONS = {
    directory: process.cwd(),
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
};
var Framework = function(options){

    options = merge.recursive(true, DEFAULT_OPTIONS, options || {});

    var config = Config.instance('framework', options);
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

    logger.debug('start AssetsManager initialization');
    try {
        this.assetsManager = new AssetsManager({
            parentConfig: config
        });
    } catch (e) {
        logger.error('initializing AssetsManager, message=`' + e.message + '`');
    }

    logger.debug('start VendorManager initialization');
    try {
        this.vendorManager = new VendorManager(config);
    } catch (e) {
        logger.error('initializing VendorManager, message=`' + e.message + '`');
    }

    logger.debug('initialized');

};
Framework.prototype = {
    logger: function(){
        return this.config.logger();
    },

    init: function(callback){
        var instance = this;

        var stack = [
            function(stackCallback){
                instance.vendorManager.init(stackCallback);
            }
        ];

        async.series(stack, function(err){
            return callback ? callback(err) : null;
        });
    },

    build: function(callback){
        var instance = this;

        var stack = [
            function(stackCallback){
                instance.phpManager.build(stackCallback);
            },
            function(stackCallback){
                instance.assetsManager.build(stackCallback);
            },
            function(stackCallback){
                instance.vendorManager.build(stackCallback);
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
            },
            function(stackCallback){
                instance.vendorManager.info(stackCallback);
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
