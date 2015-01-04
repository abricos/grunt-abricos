/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var async = require('async');
var merge = require("merge");
var glob = require("glob");
var path = require("path");
var fs = require('fs');

var Config = require('./utils/Config');
var logHelper = require('./utils/loghelper');
var Entity = require('./entity');

var UTF8 = 'utf-8';

var ENTITIES = ['AssetsManager', 'TemplateManager'];

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
    this.config = Config.instance(configId, options);

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
            buildDir = config.get('build.dir');

        var version = config.get('package.version');

        logger.info('version %s', logHelper.string(version));
        logger.info('souce dir %s', logHelper.path(srcDir));
        logger.info('build dir %s', logHelper.path(buildDir));

        this.entity.run('info', callback);
    }
};

Template.createList = function(listDir){
    var list = [],
        dirs = glob.sync(path.join(listDir, '*')),
        dir, stat;

    for (var i = 0; i < dirs.length; i++){
        dir = dirs[i];
        stat = fs.lstatSync(dir);
        if (!stat.isDirectory()){
            continue;
        }
        list[list.length] = new Template({
            directory: dir
        });
    }
    return list;
};

module.exports = Template;

/*

var TemplateList = function(owner, listDir){
    this.owner = owner;
    this.listDir = listDir;
    this.list = [];
    this._init();
};
TemplateList.prototype = {
    _init: function(){
        var list = this.list,
            dirs = glob.sync(path.join(this.listDir, '*')),
            dir, stat;

        for (var i = 0; i < dirs.length; i++){
            dir = dirs[i];
            stat = fs.lstatSync(dir);
            if (!stat.isDirectory()){
                continue;
            }
            list[list.length] = new Template({
                directory: dir
            });
        }
    },
    run: function(action, callback){
        var list = this.list,
            stack = [];

        for (var i = 0; i < list.length; i++){
            if (typeof item[action] !== 'function'){
                return callback ? callback() : null;
            }
            (function(item){
                stack.push(function(stackCallback){
                    item[action](stackCallback);
                });
            })(list[i]);
        }
        async.series(stack, function(err){
            return callback ? callback(err) : null;
        });
    }
};
Template.List = TemplateList;
/**/
