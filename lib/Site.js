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
var Entity = require('./entity');
var Template = require('./Template');

var UTF8 = 'utf-8';

var ENTITIES = [
    'AssetsManager',
    'ContentManager',
    'SiteManager',
    'VendorManager'
];

var DEFAULT_OPTIONS = {
    id: 'site',
    disableImportFilesForChild: true,
    directory: process.cwd(),
    source: {
        dir: '<%= directory %>/src'
    },
    templates: {
        dir: '<%= directory %>/templates'
    },
    log: {
        console: {
            label: 'site-<%= abricos.name %>'
        }
    }
};

var Site = function(options){
    options = merge.recursive(true, DEFAULT_OPTIONS, options || {});

    this.config = Config.instance(options);

    this.entity = new Entity(this, ENTITIES);

    var templatesDir = this.config.get('templates.dir'),
        templates = Template.createList(templatesDir, {
            parentId: this.config.id
        });

    this.entity.add(templates);

    this.logger().debug('initialized');
};
Site.prototype = {
    logger: function(){
        return this.config.logger();
    },

    init: function(callback){
        this.entity.run('init', callback);
    },

    build: function(callback){
        this.entity.run('build', callback);
    },

    info: function(callback){
        var logger = this.logger(),
            config = this.config,
            buildDir = config.get('build.dir'),
            sourceDir = config.get('source.dir'),
            templatesDir = config.get('templates.dir');

        var version = config.get('package.version');
        logger.info('version %s', logHelper.string(version));
        logger.info('source dir %s', logHelper.path(sourceDir));
        logger.info('source templates dir %s', logHelper.path(templatesDir));
        logger.info('build dir %s', logHelper.path(buildDir));

        this.entity.run('info', callback);
    }
};

module.exports = Site;
