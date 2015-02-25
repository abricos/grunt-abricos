/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var merge = require("merge");
var glob = require("glob");
var path = require("path");
var fs = require('fs');

var config = require('./utils/config');
var logHelper = config.logger().helper;

var Entity = require('./entity');

var UTF8 = 'utf-8';

var ENTITIES = [
    'AssetsManager',
    'TemplateManager'
];

var DEFAULT_OPTIONS = {
    directory: process.cwd(),
    source: {
        dir: '<%= directory %>/src'
    },
    build: {
        dir: '<%= ^^.build.dir %>/template/<%= abricos.name %>'
    },
    log: {
        console: {
            label: '<%= abricos.name %>'
        }
    }
};

var Template = function(name, options){
    options = options || {};

    var parentConfig = options.parentConfig ? options.parentConfig : config;

    this.config = parentConfig.children.create('template-' + name);

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
        directory: cwd,
        abricos: {
            name: name
        }
    });

    this.entity = new Entity(this, ENTITIES);

    this.logger().debug('initialized');
};
Template.prototype = {
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
            buildDir = config.get('build.dir'),
            name = config.get('abricos.name'),
            version = config.get('package.version');

        logger.info('name %s, version %s, type %s',
            logHelper.string(name),
            logHelper.string(version),
            logHelper.string('template')
        );
        logger.info('souce dir %s', logHelper.path(srcDir));
        logger.info('build dir %s', logHelper.path(buildDir));

        this.entity.run('info', callback);
    }
};

Template.createList = function(listDir, owner){
    var list = [],
        dirs = glob.sync(path.join(listDir, '*')),
        dir, stat, name;

    for (var i = 0; i < dirs.length; i++){
        dir = dirs[i];
        stat = fs.lstatSync(dir);
        if (!stat.isDirectory()){
            continue;
        }

        name = path.basename(dir);

        list[list.length] = new Template(name, {
            directory: dir,
            parentConfig: owner.config
        });
    }
    return list;
};

module.exports = Template;
