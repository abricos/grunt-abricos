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
var CleanCSS = require('clean-css');
var zlib = require('zlib');
var async = require('async');
var checksum = require('checksum');
var UglifyJS = require("uglify-js");
var merge = require("merge");
var less = require('less');

var logHelper = require('./loghelper');

var UTF8 = 'utf-8';

var me = module.exports;

var PHPModuleManager = function(module){
    this.module = module;
    this.id = [module.id, "php"].join(".");

    var config = require('./config.js').instance(this.id, {
        source: {
            dir: 'php'
        },
        build: {
            dir: ''
        },
        log: {
            console: {
                label: module.name + '.PHPMan'
            }
        }
    });
    this.config = config;

    var logger = this.logger();

    var srcDir = config.pathResolve('^.source.dir', 'source.dir', true);
    var buildDir = config.pathResolve('^.build.dir', 'build.dir', true);

    logger.debug('souce dir %s', logHelper.path(srcDir));
    logger.debug('build dir %s', logHelper.path(buildDir));

    fse.ensureDirSync(buildDir);
};
PHPModuleManager.prototype = {
    logger: function(){
        return this.config.logger();
    },

    _buildFile: function(srcFile){
        var config = this.config,
            logger = this.logger(),
            srcDir = config.get('source.dir'),
            relSrcFile = path.relative(srcDir, srcFile),
            buildDir  = config.get('build.dir'),
            destFile = path.join(buildDir, relSrcFile),
            extname = path.extname(relSrcFile);

        var content = fs.readFileSync(srcFile, UTF8);
        switch (extname.toLowerCase()){
            case ".php":
            case ".html":
                content = content.replace("{C#VERSION}", this.module.version);
                break;
        }

        fse.ensureDirSync(path.dirname(destFile));
        fs.writeFileSync(destFile, content);
    },

    _buildDir: function(dir){
        var files = glob.sync(path.join(dir, '*')),
            file, stat;
        for (var i = 0; i < files.length; i++){
            file = files[i];
            stat = fs.lstatSync(file);
            if (stat.isDirectory()){
                this._buildDir(file);
            }else if (stat.isFile()){
                this._buildFile(file);
            }
        }
    },

    build: function(callback){
        var logger = this.logger(),
            config = this.config,
            srcDir = config.get('source.dir');

        logger.debug('start build');

        this._buildDir(srcDir);

        if (callback){
            callback();
        }
    }
};

module.exports.PHPModuleManager = PHPModuleManager;
