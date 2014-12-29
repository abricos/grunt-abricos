/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var fse = require('fs-extra');
var async = require('async');
var merge = require("merge");
var path = require('path');

var php = require('../php');
var assets = require('../assets');

var UTF8 = 'utf-8';

var Framework = function(options){

    options = merge({
        directory: process.cwd()
    }, options || {});

    this.directory = options.directory = path.resolve(options.directory);

    var pkg = this.package = pkgManager.read(options);

    this.version = pkg.version;

    this.id = "core";

    var config = this.config = require('./../config.js').instance(this.id, {
        directory: options.directory,
        build: {
            dir: ''
        },
        source: {
            dir: 'src'
        },
        log: {
            console: {
                label: 'core'
            }
        }
    });

    var logger = this.logger();

    config.pathResolve('directory', 'source.dir', true);
    config.pathResolve('^.build.dir', 'build.dir', true);

    logger.debug('start PHPManager initialization');
    try {
        this.phpManager = new php.PHPManager(this);
    } catch (e) {
        logger.error('initializing PHPManager, message=`' + e.message + '`');
    }

    logger.debug('start AssetsManager initialization');
    try {
        this.assetsManager = new assets.AssetsCoreManager(this);
    } catch (e) {
        logger.error('initializing AssetsManager, message=`' + e.message + '`');
    }

    logger.debug('initialized');
};
Framework.prototype = {
    logger: function(){
        return this.config.logger();
    },

    build: function(callback){
        var stack = [], instance = this;

        stack.push(function(stackCallback){
            instance.phpManager.build(stackCallback);
        });

        stack.push(function(stackCallback){
            instance.assetsManager.build(stackCallback);
        });

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    }
};

module.exports.Framework = Framework;
