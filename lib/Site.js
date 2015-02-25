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

var config = require('./utils/config');
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

    this.config = config.children.create('site');
    var cwd = options.directory || process.cwd();
    this.config.configure({
        sources: [
            {
                cwd: cwd,
                type: 'json',
                key: 'abricos',
                src: '.abricos.json'
            }, {
                cwd: cwd,
                type: 'json',
                key: 'package',
                src: 'package.json'
            }, {
                cwd: cwd,
                type: 'json',
                src: 'myabricos.json'
            }
        ]
    });

    this.config.setDefaults(DEFAULT_OPTIONS);
    this.config.init({
        directory: cwd
    });

    /*
    options = merge.recursive(true, DEFAULT_OPTIONS, options || {});

    this.config = Config.instance(options);
    /**/

    this.entity = new Entity(this, ENTITIES);

    var templatesDir = this.config.get('templates.dir'),
        templates = Template.createList(templatesDir, this);

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
            logHelper = logger.helper,
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
