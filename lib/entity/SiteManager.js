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
var Config = require('../utils/Config');

var UTF8 = 'utf-8';

var DEFAULT_OPTIONS = {
    id: 'site',
    source: {
        dir: '<%= ^.source.dir %>/files'
    },
    build: {
        dir: '<%= ^.build.dir %>'
    },
    log: {
        console: {
            label: '<%= ^.log.console.label %>.Site'
        }
    }
};

var SiteManager = function(options){
    options = merge.recursive(true, DEFAULT_OPTIONS, options || {})

    this.config = Config.instance(options);
};
SiteManager.prototype = {
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
            name = path.basename(srcFile, extname),
            version = config.get('package.version');

        fse.ensureDirSync(path.dirname(destFile));

        logger.debug('Build: %s', logHelper.path(relSrcFile));

        var content = fs.readFileSync(srcFile, UTF8);

        switch (extname.toLowerCase()) {
            case ".php":
            case ".html":
                content = content.replace("{C#VERSION}", version);
                break;
        }
        if (extname.toLowerCase() === '.html'){
            var parsed = brick.parse(content);

            // TODO: validate parsed (php script and etc.)

            destFile = path.join(destDir, name + '.json');
            fse.writeJSONFileSync(destFile, parsed);

        } else {
            fs.writeFileSync(destFile, content);
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

        this._buildDir(srcDir);

        return callback ? callback() : null;
    },

    info: function(callback){
        var logger = this.logger(),
            config = this.config,
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        logger.info('souce dir %s', logHelper.path(srcDir));
        logger.info('build dir %s', logHelper.path(buildDir));

        return callback ? callback() : null;
    }
};

module.exports = SiteManager;
