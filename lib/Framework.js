/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var merge = require("merge");

var Config = require('./utils/Config');
var logHelper = require('./utils/loghelper');
var Entity = require('./entity');

var UTF8 = 'utf-8';

var ENTITIES = [
    'AssetsManager',
    'PHPManager',
    'VendorManager'
];

var DEFAULT_OPTIONS = {
    directory: process.cwd(),
    source: {
        dir: '<%= directory %>/src'
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
    options = merge.recursive(true, DEFAULT_OPTIONS, options || {});

    this.config = Config.instance('framework', options);

    this.entity = new Entity(this, ENTITIES);

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
