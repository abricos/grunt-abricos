/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var async = require('async');
var merge = require("merge");

var Config = require('./utils/Config');
var logHelper = require('./utils/loghelper');

var UTF8 = 'utf-8';


var ENTITIES = ['AssetsManager', 'TemplateManager'];

var AssetsManager = require('./entity/AssetsManager');
var TemplateManager = require('./entity/TemplateManager');

var DEFAULT_OPTIONS = {
    directory: process.cwd(),
    source: {
        dir: '<%= directory %>/src'
    },
    build: {
        dir: '<%= ^.build.dir %>/template/<%= abricos.name %>'
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

    logger.debug('start AssetsManager initialization');
    try {
        this.assetsManager = new AssetsManager({
            parentConfig: config
        });
    } catch (e) {
        logger.error('initializing AssetsManager, message=`' + e.message + '`');
    }

    logger.debug('start TemplateManager initialization');
    try {
        this.templateManager = new TemplateManager({
            parentConfig: config
        });
    } catch (e) {
        logger.error('initializing TemplateManager, message=`' + e.message + '`');
    }

    logger.debug('initialized');
};
Template.prototype = {
    logger: function(){
        return this.config.logger();
    },

    init: function(callback){
        var instance = this;

        var stack = [];

        async.series(stack, function(err){
            return callback ? callback(err) : null;
        });
    },

    build: function(callback){
        var instance = this;

        var stack = [
            function(stackCallback){
                instance.assetsManager.build(stackCallback);
            },
            function(stackCallback){
                instance.templateManager.build(stackCallback);
            }
        ];

        async.series(stack, function(err){
            return callback ? callback(err) : null;
        });
    },

    info: function(callback){
        var logger = this.logger(),
            config = this.config,
            instance = this,
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        var version = config.get('package.version');

        logger.info('version %s', logHelper.string(version));

        logger.info('souce dir %s', logHelper.path(srcDir));
        logger.info('build dir %s', logHelper.path(buildDir));

        var stack = [
            function(stackCallback){
                instance.assetsManager.info(stackCallback);
            },
            function(stackCallback){
                instance.templateManager.info(stackCallback);
            }
        ];

        async.series(stack, function(err){
            return callback ? callback(err) : null;
        });
    }
};

module.exports = Template;
