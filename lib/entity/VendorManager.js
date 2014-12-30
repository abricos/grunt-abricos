/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var glob = require('glob');
var async = require('async');
var merge = require('merge');
var bower = require('bower');

var logHelper = require('../utils/loghelper');
var Config = require('../utils/Config');

var UTF8 = 'utf-8';
var DEFAULT_OPTIONS = {
    source: {
        dir: 'vendor'
    },
    build: {
        dir: 'vendor'
    },
    init: {
        dir: ''
    },
    log: {
        console: {
            label: '<%= ^.log.console.label %>.Vendor'
        }
    }
};

var VendorManager = function(parentConfig, options){

    if (!parentConfig){
        throw new Error('`parentConfig` not set in VendorManager');
    }

    options = merge.recursive(true, DEFAULT_OPTIONS, options || {})

    var configId = [parentConfig.id, "vendor"].join(".");
    var config = Config.instance(configId, options);
    this.config = config;

    var logger = this.logger();

    var srcDir = config.pathResolve('^.source.dir', 'source.dir', true);
    var buildDir = config.pathResolve('^.build.dir', 'build.dir', true);

    logger.debug('souce dir %s', logHelper.path(srcDir));
    logger.debug('build dir %s', logHelper.path(buildDir));
};
VendorManager.prototype = {
    logger: function(){
        return this.config.logger();
    },

    init: function(callback){
        callback = callback || function(){
        };

        var logger = this.logger(),
            config = this.config,
            directory = config.get('directory'),
            bowerFile = path.join(directory, 'bower.json'),
            bowerFileExists = fs.existsSync(bowerFile);

        logger.debug('bower: file %s %s', (bowerFileExists ? 'found' : 'not found'), logHelper.path(bowerFile));
        if (!bowerFileExists){
            return callback();
        }

        bower.commands.install([], {}, {
            cwd: directory
        }).on('log', function(result) {
            logger.debug('bower: %s', result.message);
            // grunt.log.writeln(['bower', result.id.cyan, result.message].join(' '));
        }).on('end', function() {
            logger.info('bower: install');
            // grunt.log.writeln(['bower install'].join(' '));
            callback(null);
        }).on('error', function(error) {
            logger.error('bower: %s', error.message);
            callback(error);
        });
    },

    build: function(callback){
        var logger = this.logger(),
            config = this.config,
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        if (!fs.existsSync(srcDir)){
            if (callback){
                callback();
            }
            return;
        }

        fse.ensureDirSync(buildDir);

        logger.debug('start build');

        fse.copy(srcDir, buildDir, function(err){
            if (callback){
                callback(err);
            }
        });
    },

    info: function(callback){
        var logger = this.logger(),
            config = this.config,
            directory = config.get('directory'),
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        logger.info('directory %s', logHelper.path(directory));
        logger.info('souce dir %s', logHelper.path(srcDir));
        logger.info('build dir %s', logHelper.path(buildDir));

        if (callback){
            callback();
        }
    }
};

module.exports = VendorManager;
