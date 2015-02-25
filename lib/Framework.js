/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var merge = require("merge");

var config = require('./utils/config');

var Entity = require('./entity');
var Module = require('./Module');
var Template = require('./Template');

var UTF8 = 'utf-8';

var ENTITIES = [
    'AssetsManager',
    'PHPManager',
    'VendorManager'
];

var DEFAULT_OPTIONS = {
    directory: process.cwd(),
    source: {
        dir: '<%= directory %>/src',
        modules: {
            dir: '<%= directory %>/modules'
        },
        templates: {
            dir: '<%= directory %>/templates'
        }
    },
    build: {
        dir: '<%= ^^.build.dir %>'
    },
    log: {
        console: {
            label: 'framework'
        }
    }
};
var Framework = function(options){
    options = options || {};

    this.config = config.children.create('framework');

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

    this.entity = new Entity(this, ENTITIES);

    var templatesDir = this.config.get('source.templates.dir'),
        templates = Template.createList(templatesDir, this);

    this.entity.add(templates);

    var modulesDir = this.config.get('source.modules.dir'),
        modules = Module.createList(modulesDir, this);

    this.entity.add(modules);

    this.logger().debug('initialized');
};
Framework.prototype = {
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
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        var version = config.get('package.version');
        logger.info('version %s', logHelper.string(version));
        logger.info('souce dir %s', logHelper.path(srcDir));
        logger.info('build dir %s', logHelper.path(buildDir));

        this.entity.run('info', callback);
    }
};

module.exports = Framework;
