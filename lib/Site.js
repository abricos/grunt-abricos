/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var async = require('async');
var merge = require("merge");
var glob = require('glob');
var path = require('path');
var fs = require('fs');

var Config = require('./utils/Config');
var logHelper = require('./utils/loghelper');
var Template = require('./Template');

var UTF8 = 'utf-8';

var DEFAULT_OPTIONS = {
    directory: process.cwd(),
    source: {
        dir: 'src'
    },
    templates: {
        dir: 'templates'
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

    config.pathResolve('directory', 'source.dir', true);

    var templatesDir =
        config.pathResolve('directory', 'templates.dir', true);

    var templates = this.templates = [];

    var dirs = glob.sync(path.join(templatesDir, '*')),
        dir, stat;

    for (var i = 0; i < dirs.length; i++){
        dir = dirs[i];
        stat = fs.lstatSync(dir);
        if (!stat.isDirectory()){
            continue;
        }
        logger.debug('start Template initialization');
        try {
            templates[templates.length] = new Template({
                parentConfig: config
            });
        } catch (e) {
            logger.error('initializing Template, message=`' + e.message + '`');
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
            instance = this,
            buildDir = config.get('build.dir'),
            sourceDir = config.get('source.dir'),
            templatesDir = config.get('templates.dir');

        logger.info('build dir %s', logHelper.path(buildDir));
        logger.info('source dir %s', logHelper.path(sourceDir));
        logger.info('templates dir %s', logHelper.path(templatesDir));

        var version = config.get('package.version');

        logger.info('version %s', logHelper.string(version));

        var stack = [];

        var templates = this.templates;
        for (var i = 0; i < templates.length; i++){
            (function(template){
                stack.push(function(stackCallback){
                    template.info(stackCallback);
                });
            })(templates[i]);
        }

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    }
};

module.exports = Site;
