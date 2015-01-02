/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var async = require('async');
var merge = require("merge");

var Config = require('./utils/Config');
var AssetsManager = require('./entity/AssetsManager');
var logHelper = require('./utils/loghelper');

var UTF8 = 'utf-8';

var DEFAULT_OPTIONS = {
    directory: process.cwd(),
    source: {
        dir: 'src'
    },
    build: {
        dir: 'template/<%= abricos.name %>'
    },
    log: {
        console: {
            label: '<%= abricos.name %>'
        }
    }
};

var Template = function(options){

    options = merge.recursive(true, DEFAULT_OPTIONS, options || {});

    var configId = Config.genid('template_');
    var config = Config.instance(configId, options);

    this.config = config;

    var logger = this.logger();

    config.pathResolve('directory', 'source.dir', true);
    config.pathResolve('^.build.dir', 'build.dir', true);

    logger.debug('start AssetsManager initialization');
    try {
        this.assetsManager = new AssetsManager({
            parentConfig: config
        });
    } catch (e) {
        logger.error('initializing AssetsManager, message=`' + e.message + '`');
    }

    logger.debug('initialized');
};
Template.prototype = {
    logger: function(){
        return this.config.logger();
    },

    init: function(callback){
        var instance = this;

        var stack = [
        ];

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    },

    build: function(callback){
        var instance = this;

        var stack = [
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

module.exports = Template;
