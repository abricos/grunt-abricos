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

var Config = require('./utils/Config');
var logHelper = Config.logHelper;
var Entity = require('./entity');

var UTF8 = 'utf-8';

var ENTITIES = ['AssetsManager', 'TemplateManager'];

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

var Template = function(options){
    options = options || {};
    var name = options.name;
    if (!name){
        name = Config.instance().get('abricos.name');
    }

    var defOptions = merge.recursive(true, DEFAULT_OPTIONS, {
        id: 'template-' + name
    });

    options = merge.recursive(true, defOptions, options || {});

    this.config = Config.instance(options);

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

Template.createList = function(listDir, options){
    options = options || {};
    var list = [],
        dirs = glob.sync(path.join(listDir, '*')),
        dir, stat, entOptions = {}, name;

    for (var i = 0; i < dirs.length; i++){
        dir = dirs[i];
        stat = fs.lstatSync(dir);
        if (!stat.isDirectory()){
            continue;
        }

        name = path.basename(dir);

        entOptions = merge.recursive(true, options, {
            id: 'template-' + name,
            directory: dir,
            abricos: {
                name: name
            },
            log: {
                console: {
                    label: '<%= ^.log.console.label %>.Template'
                }
            }
        });

        list[list.length] = new Template(entOptions);
    }
    return list;
};

module.exports = Template;
