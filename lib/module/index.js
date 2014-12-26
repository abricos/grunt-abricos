/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var util = require("util");
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var glob = require('glob');
var CleanCSS = require('clean-css');
var zlib = require('zlib');
var async = require('async');
var checksum = require('checksum');
var UglifyJS = require("uglify-js");
var merge = require("merge");
var less = require('less');

var js = require('./js');
var php = require('./php');
var assets = require('./assets');

var UTF8 = 'utf-8';

var Module = module.exports = function(options){

    options = merge({
        directory: process.cwd()
    }, options || {});

    this.directory = path.resolve(options.directory);

    if (options.name){
        this.name = options.name;
    }

    // check package.json
    var pkg = this.getPackageInfo();

    this.version = pkg.version;

    if (!this.name){
        this.name = pkg.name;
    }

    this.id = "module_" + this.name;

    var config = this.config = require('./../config.js').instance(this.id, {
        directory: options.directory,
        build: {
            dir: 'modules/' + this.name
        },
        temp: {
            dir: 'modules/' + this.name
        },
        source: {
            dir: 'src'
        },
        log: {
            console: {
                label: this.name
            }
        }
    });
    config.load();

    var logger = this.logger();

    config.pathResolve('directory', 'source.dir', true);
    config.pathResolve('^.build.dir', 'build.dir', true);
    config.pathResolve('^.temp.dir', 'temp.dir', true);

    this.logger().debug('beginning of PHPModuleManager initialization');
    try {
        this.phpManager = new php.PHPModuleManager(this);
    } catch (e) {
        logger.error('initializing PHPModuleManager, message=`' + e.message + '`');
    }

    this.logger().debug('beginning of JSManager initialization');
    try {
        this.jsManager = new js.JSManager(this);
    } catch (e) {
        logger.error('initializing JSManager, message=`' + e.message + '`');
    }

    this.logger().debug('beginning of AssetsManager initialization');
    try {
        this.assetsManager = new assets.AssetsModuleManager(this);
    } catch (e) {
        logger.error('initializing AssetsManager, message=`' + e.message + '`');
    }

    this.logger().debug('initialized');
};
Module.prototype = {
    logger: function(){
        return this.config.logger();
    },
    getPackageInfo: function(){
        if (this._package){
            return this._package;
        }

        var packageFile = this._packageFile = path.join(this.directory, "package.json");
        var pkg;
        try {
            pkg = fse.readJSONFileSync(packageFile, UTF8);
        } catch (e) {
            var msg = "File not found or access denied or JSON syntax error in '" + path.relative(process.cwd(), packageFile) + "'";
            throw new Error(msg);
        }
        this._package = pkg;

        if (!pkg.version){
            var msg = "Version not set in package.json'" + path.relative(process.cwd(), this._packageFile) + "'";
            throw new Error(msg);
        }

        return pkg;
    },

    jsBuild: function(callback){
        var stack = [], instance = this;

        stack.push(function(stackCallback){
            instance.jsManager.build(stackCallback);
        });
        stack.push(function(stackCallback){
            instance.jsManager.minify(stackCallback);
        });

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    },

    build: function(callback){
        var stack = [], instance = this;

        stack.push(function(stackCallback){
            instance.phpManager.build(stackCallback);
        });

        stack.push(function(stackCallback){
            instance.assetsManager.build(stackCallback);
        });

        stack.push(function(stackCallback){
            instance.jsBuild(stackCallback);
        });

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    }
};
