/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var Mocha = require("mocha");

var merge = require("merge");
var glob = require("glob");
var path = require("path");
var fs = require('fs');
var fse = require('fs-extra');

var treeConfig = require('./utils/Config');
var logHelper = treeConfig.utils.helper;
var Entity = require('./entity');

var Template = require('./Template');

var UTF8 = 'utf-8';

var ENTITIES = [
    'AssetsManager',
    'PHPManager',
    'JSManager',
    'VendorManager'
];

var DEFAULT_OPTIONS = {
    directory: process.cwd(),
    source: {
        dir: '<%= directory %>/src',
        templates: {
            dir: '<%= directory %>/templates'
        }
    },
    build: {
        dir: '<%= ^^.build.dir %>/modules/<%= abricos.name %>'
    },
    test: {
        api: {
            source: {
                dir: '<%= directory %>/test/api'
            }
        }
    },
    docs: {
        api: {
            source: {
                dir: '<%= directory %>/src/php'
            },
            build: {
                dir: '<%= ^^.directory %>/docs/api/<%= abricos.name %>'
            }
        }
    },
    log: {
        console: {
            label: '<%= abricos.name %>'
        }
    }
};

var Module = function(options){
    options = options || {};
    var name = options.name;
    if (!name){
        name = treeConfig.instance().get('abricos.name');
    }
    var defOptions = merge.recursive(true, DEFAULT_OPTIONS, {
        id: 'module-' + name
    });

    options = merge.recursive(true, defOptions, options || {});

    this.config = treeConfig.instance(options);

    this.entity = new Entity(this, ENTITIES);

    var templatesDir = this.config.get('source.templates.dir'),
        templates = Template.createList(templatesDir, {
            parentId: this.config.id
        });

    this.entity.add(templates);

    this.logger().debug('initialized');
};
Module.prototype = {
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
    },

    docsAPI: function(callback){

        var config = this.config,
            srcDir = config.get('docs.api.source.dir'),
            buildDir = config.get('docs.api.build.dir');

        var apidoc = require('apidoc');

        var options = {
            src: srcDir,
            dest: buildDir
        };

        var chunk = apidoc.createDoc(options);
        return callback ? callback() : null;
    },

    testAPI: function(callback){

        var config = this.config,
            srcDir = config.get('test.api.source.dir'),
            files = glob.sync(path.join(srcDir, '*.js'));

        if (files.length === 0){
            return callback ? callback() : null;
        }

        var options = {
            mocha: {
                reporter: 'spec',
                globals: [
                    'setImmediate',
                    'clearImmediate'
                ]
            }
        };

        var mocha = new Mocha(options);
        mocha.files = files;
        mocha.run(function(errCount){
            return callback ? callback() : null;
        });
    }
};

Module.createList = function(listDir, options){
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
            id: 'module-' + name,
            directory: dir,
            abricos: {
                name: name
            },
            log: {
                console: {
                    label: '<%= ^.log.console.label %>.Module'
                }
            }
        });

        list[list.length] = new Module(entOptions);
    }
    return list;
};


module.exports = Module;
