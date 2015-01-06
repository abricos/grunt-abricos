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

var logHelper = require('../utils/loghelper');
var Config = require('../utils/Config');

var UTF8 = 'utf-8';

var DEFAULT_OPTIONS = {
    id: 'assets',
    source: {
        dir: '<%= ^.source.dir %>/assets'
    },
    build: {
        dir: '<%= ^.build.dir %>/assets'
    },
    log: {
        console: {
            label: '<%= ^.log.console.label %>.ASSETS'
        }
    }
};

var AssetsManager = function(options){
    options = merge.recursive(true, DEFAULT_OPTIONS, options || {});

    this.config = Config.instance(options);
};
AssetsManager.prototype = {
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
            content;

        fse.ensureDirSync(destDir);

        try {
            content = fs.readFileSync(srcFile, UTF8);
            logger.debug('successfully read %s bytes in %s', logHelper.number(content.length), logHelper.file(srcFile));
        } catch (err) {
            logger.error(err.message);
            return;
        }

        if (extname.toLowerCase() === '.less'){
            destFile = path.join(destDir, name + '.css');

            var lessOptions = config.get('less');

            less.render(content, lessOptions, function(err, output){
                if (err){
                    logger.error(err.message);
                    return; //callback(null, "");
                }
                content = output.css;
                logger.debug('LESS: compile successfully %s bytes', logHelper.number(content.length));
                fs.writeFileSync(destFile, content);

                var destFileMin = path.join(destDir, name + '-min.css');
                var contentMin = (new CleanCSS()).minify(content).styles;
                fs.writeFileSync(destFileMin, contentMin);
            });

        } else {
            fs.writeFileSync(destFile, content);
        }
    },

    _buildDir: function(dir){

        if (path.dirname(dir) === 'includes'){
            // ignore LESS includes dir
            return;
        }

        var files = glob.sync(path.join(dir, '*')),
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
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        fse.removeSync(buildDir);

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

module.exports = AssetsManager;
