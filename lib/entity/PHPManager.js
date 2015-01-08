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
var merge = require("merge");

var logHelper = require('../utils/loghelper');
var brick = require('./brick');
var constParser = require('./constParser');
var Config = require('../utils/Config');

var UTF8 = 'utf-8';

var DEFAULT_OPTIONS = {
    id: 'php',
    source: {
        dir: '<%= ^.source.dir %>/php'
    },
    build: {
        dir: '<%= ^.build.dir %>'
    },
    log: {
        console: {
            label: '<%= ^.log.console.label %>.PHP'
        }
    }
};

var PHPManager = function(options){
    options = merge.recursive(true, DEFAULT_OPTIONS, options || {})

    this.config = Config.instance(options);
};
PHPManager.prototype = {
    logger: function(){
        return this.config.logger();
    },

    _buildFile: function(srcFile){
        var config = this.config,
            logger = this.logger(),
            srcDir = config.get('source.dir'),
            relSrcFile = path.relative(srcDir, srcFile),
            buildDir = config.get('build.dir'),
            destFile = path.join(buildDir, relSrcFile),
            destDir = path.dirname(destFile),
            extname = path.extname(relSrcFile),
            name = path.basename(srcFile, extname);

        fse.ensureDirSync(path.dirname(destFile));

        logger.debug('Build: %s', logHelper.path(relSrcFile));

        if (extname.toLowerCase() === ".php"){
            var content = fs.readFileSync(srcFile, UTF8);
            content = constParser.parse(config, content);
            fs.writeFileSync(destFile, content);
        } else if (extname.toLowerCase() === ".html"){
            var content = fs.readFileSync(srcFile, UTF8);
            content = constParser.parse(config, content);

            var parsed = brick.parse(content);

            // TODO: validate parsed (php script and etc.)

            destFile = path.join(destDir, name + '.json');
            fse.writeJSONFileSync(destFile, parsed);
        } else {
            fse.copySync(srcFile, destFile);
        }
    },

    _buildDir: function(dir){
        var files = glob.sync(path.join(dir, '*'), {dot: true}),
            file, stat;
        for (var i = 0; i < files.length; i++){
            file = files[i];
            stat = fs.lstatSync(file);
            if (stat.isDirectory()){
                this._buildDir(file);
            } else if (stat.isFile()){
                this._buildFile(file);
            }
        }
    },

    build: function(callback){
        var logger = this.logger(),
            config = this.config,
            srcDir = config.get('source.dir');

        logger.debug('start build');

        this.info(null, true);

        this._buildDir(srcDir);

        return callback ? callback() : null;
    },

    info: function(callback, isDebug){
        var logger = this.logger(),
            config = this.config,
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir'),
            level = isDebug ? 'debug' : 'info';


        logger[level]('souce dir %s', logHelper.path(srcDir));
        logger[level]('build dir %s', logHelper.path(buildDir));

        return callback ? callback() : null;
    }
};

module.exports = PHPManager;
