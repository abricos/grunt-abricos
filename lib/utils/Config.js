/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var merge = require('merge');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var util = require('util');
var winston = require('winston');
var dateFormat = require('dateformat');
var chalk = require('chalk');

var logHelper = require('./loghelper');

var UTF8 = 'utf-8';

var CONFIG_FILE = "abricosgrunt.json";
var DEFAULT_OPTIONS = {
    directory: process.cwd(),
    build: {
        dir: "build"
    },
    temp: {
        dir: "build_temp"
    },
    log: {
        console: {
            level: 'info',
            colorize: 'true',
            timestamp: 'HH:MM:ss'
        }
    },
    less: {
        async: true,
        parse: [
            'paths', 'optimization', 'filename', 'strictImports',
            'syncImport', 'dumpLineNumbers', 'relativeUrls', 'rootpath'
        ],
        render: [
            'compress', 'cleancss', 'ieCompat', 'strictMath',
            'strictUnits', 'sourceMap', 'sourceMapFilename',
            'sourceMapURL', 'sourceMapBasepath', 'sourceMapRootpath',
            'outputSourceFiles'
        ]
    }
};

var Config = function(id, parent, options){
    this.id = id || "_root_";
    this.parent = parent;

    this.init(options);
};
Config.prototype = {
    init: function(options){
        options = options || {};

        var root = this;
        while (root.parent){
            root = root.parent;
        }
        this.root = root === this ? null : root;

        var defOptions = !this.parent ? DEFAULT_OPTIONS : {};

        var directory = options.directory;
        if (!directory){
            directory = this.parent ?
                this.parent.get('directory') :
                DEFAULT_OPTIONS.directory;
        }

        if (directory){
            var packageFile = path.join(directory, 'package.json');
            if (fs.existsSync(packageFile)){
                var pkg;
                try {
                    pkg = fse.readJSONFileSync(packageFile, UTF8);
                } catch (e) {
                    var msg = 'Access denied or JSON syntax error in `' + packageFile + '`';
                    throw new Error(msg);
                }
                defOptions.package = pkg;
            }

            var abricosFile = path.join(directory, '.abricos.json');
            if (fs.existsSync(abricosFile)){
                var abricos;
                try {
                    abricos = fse.readJSONFileSync(abricosFile, UTF8);
                } catch (e) {
                    var msg = 'Access denied or JSON syntax error in `' + abricosFile + '`';
                    throw new Error(msg);
                }
                defOptions.abricos = abricos;
            }
        }
        options = merge.recursive(true, defOptions, options);

        var configFile = path.join(directory, CONFIG_FILE),
            configFileJSON = {};

        if (fs.existsSync(configFile)){
            try {
                configFileJSON = fse.readJSONFileSync(configFile);
            } catch (e) {
                var msg = 'Access denied or JSON syntax error in `' + configFile + '`';
                throw new Error(msg);
            }
        }
        this._options = merge.recursive(true, options, configFileJSON);
        this._options = this.compile(this._options);

        this.logger().debug('initializing config');
    },
    compile: function(ret){
        if (typeof ret === 'object'){

            for (var n in ret){
                ret[n] = this.compile(ret[n]);
            }
            return ret;
        }

        if (typeof ret !== 'string'){
            return ret;
        }

        var regexp = /\<\%=(.*?)\%\>/,
            a,
            val;
        do {
            a = regexp.exec(ret);
            if (!a){
                break;
            }
            val = a[1];
            val = this.get(val) || '';
            ret = ret.replace(regexp, val);
        } while (a);

        return ret;
    },
    get: function(key, options){
        options = options || {};
        options.onlyThis = options.onlyThis || false;

        key = key.replace(/^\s+|\s+$/g, '');

        var aKey = (key || '').split('.'),
            ret,
            iKey;

        if (aKey[0] === ''){
            return;
        } else if (aKey[0] === '^^'){
            if (!this.root){
                this.logger().error('can`t get value config for a root level: ' + key);
                return;
            }
            aKey.shift();
            return this.root.get(aKey.join('.'), options)
        } else if (aKey[0] === '^'){
            if (!this.parent){
                this.logger().error('can`t get value config for a higher level: ' + key);
                return;
            }
            aKey.shift();
            return this.parent.get(aKey.join('.'), options)
        }

        for (var i = 0; i < aKey.length; i++){
            iKey = aKey[i];
            if (i === 0){
                ret = this._options;
            }
            if (!ret[iKey]){
                if (this.parent){
                    if (options.onlyThis){
                        return options.default;
                    }
                    return this.parent.get(key, options);
                }
                if (!options.default){
                    this.logger().warn('value not set in config, key %s, id %s', logHelper.string(key), logHelper.string(this.id));
                }
                return options.default;
            } else {
                ret = ret[iKey];
            }
        }

        return ret;
    },
    set: function(key, value){
        var aKey = key.split('.'),
            config = this._options,
            iKey;

        for (var i = 0; i < aKey.length; i++){
            iKey = aKey[i];
            if (i === (aKey.length - 1)){
                config[iKey] = value;
            } else if (!config[iKey]){
                config[iKey] = {};
            } else {
                config = config[iKey];
            }
        }
    },

    getRecursive: function(key){
        var config = this, arr = [];
        while (config){
            arr[arr.length] = config;
            config = config.parent;
        }
        var ret = {};
        while (arr.length > 0){
            config = arr.pop();
            ret = merge.recursive(true, ret, config.get(key, {
                onlyThis: true
            }) || {})
        }

        return ret;
    },
    logger: function(){
        if (this._logger){
            return this._logger;
        }
        var logOptions = this.getRecursive('log');

        for (var n in logOptions){
            (function(transport){
                var format = transport.timestamp;
                if (typeof format !== 'string'){
                    return;
                }
                transport.timestamp = function(){
                    var str = dateFormat(new Date(), format);
                    if (transport.colorize === 'true'){
                        str = chalk.gray(str);
                        return str;
                    }
                    return str;
                };
            })(logOptions[n]);
        }

        winston.loggers.add(this.id, logOptions);

        return this._logger = winston.loggers.get(this.id);
    },
    pathResolve: function(keyFrom, keyTo, isSet){
        var pathFrom = this.get(keyFrom),
            pathTo = this.get(keyTo),
            logger = this.logger();

        if (typeof pathFrom !== 'string' || typeof pathTo !== 'string'){
            throw new Error('Arguments to config.pathResolve must be strings, id=' + this.id + ', arguments[' + keyFrom + ',' + keyTo + ']');
        }

        if (!pathFrom || !pathTo){
            logger.debug('empty value in function config.pathResolve, id=' + this.id);
            return;
        }

        var rPath = path.resolve(pathFrom, pathTo);
        if (isSet){
            this.set(keyTo, rPath);
        }
        return rPath;
    }
};

var ConfigManager = function(){
};
ConfigManager.prototype = {
    instance: function(key, config){
        if (!this._rootConfig){
            this._rootConfig = {
                instance: new Config(),
                childs: {}
            }
        }
        var rootConfig = this._rootConfig;

        if (!key){
            return rootConfig.instance;
        }

        var aKey = key.split('.'), iKey,
            current = rootConfig, parent;

        for (var i = 0; i < aKey.length; i++){
            iKey = aKey[i];
            parent = current;
            current = parent.childs[iKey];

            if (!current){
                if (i < (aKey.length - 1)){
                    throw new Error('Defective structure configs: ' + key);
                } else {
                    parent.childs[iKey] = current = {
                        instance: new Config(key, parent.instance, config),
                        childs: {}
                    };
                }
            }
        }
        return current.instance;
    }
};

var me = module.exports;

me.instance = function(key, config){
    if (!this._manager){
        this._manager = new this.ConfigManager();
    }
    return this._manager.instance(key, config);
};
me.genid = function(prefix){
    if (!this._uniqueCounter){
        this._uniqueCounter = 0;
    }
    prefix = prefix || '';

    return prefix + (this._uniqueCounter++);
};
me.Config = Config;
me.ConfigManager = ConfigManager;


