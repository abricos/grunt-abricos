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
var TemplateManager = require('./entity/TemplateManager');

var UTF8 = 'utf-8';

var DEFAULT_OPTIONS = {
    directory: process.cwd(),
    build: {
        dir: '.'
    },
    source: {
        dir: 'src',
        templates: {
            dir: 'templates'
        }
    },
    log: {
        console: {
            label: 'site-<%= abricos.name %>'
        }
    }
};

var Site = function(options){

    options = merge.recursive(true, DEFAULT_OPTIONS, options || {});

    var config = Config.instance('site', options);

    this.config = config;

    var logger = this.logger();

    config.pathResolve('^.build.dir', 'build.dir', true);
    config.pathResolve('directory', 'source.dir', true);
    var templatesDir = config.pathResolve('directory', 'source.templates.dir', true);

    var tplMans = this.templateManagers = [];

    var dirs = glob.sync(path.join(templatesDir, '*')),
        stat;
    for (var i = 0; i < dirs.length; i++){
        stat = fs.lstatSync(file);
        if (!stat.isDirectory()){
            continue;
        }
        try {
            tplMans[tplMans.length] = new TemplateManager({
                parentConfig: config
            });
        } catch (e) {
            logger.error('initializing AssetsManager, message=`' + e.message + '`');
        }


    }

    logger.debug('initialized');
};
Site.prototype = {
    logger: function(){
        return this.config.logger();
    },

    build: function(callback){
        var instance = this;

        var stack = [
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

        var stack = [];

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    }
};

module.exports = Site;
