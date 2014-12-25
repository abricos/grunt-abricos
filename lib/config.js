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

var CONFIG_FILE = "abricosgrunt.json";
var DEFAULT_CONFIG = {
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
            timestamp: 'true'
        }
    },
    less: {
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

var Config = function(id, parent, config){
    this.id = id || "_root_";
    this.parent = parent;
    this._config = config || DEFAULT_CONFIG;

    var root = this;
    while(root.parent){
        root = root.parent;
    }
    this.root = root === this ? null : root;

    this.init(config);
};
Config.prototype = {
    init: function(config){
        this._config = merge.recursive(true, this._config, config || {});
        this.logger().debug('initializing config, id=`%s`', this.id);
    },
    load: function(){
        this.logger().debug('starts loading the configuration file in `%s`', this.id);

        var config = this._config;
        var configFile = path.join(config.directory, CONFIG_FILE),
            relConfigFile = path.relative(process.cwd(), configFile);

        if (fs.existsSync(configFile)){
            this.logger().debug('config file is found, begin loading: ' + relConfigFile);
            try {
                var configJSON = fse.readJSONFileSync(configFile);
                this._config = merge.recursive(this._config, configJSON || {});
            } catch (e) {
                this.logger().error('JSON Syntax error in : ' + relConfigFile);
            }
        } else {
            this.logger().debug('config file not found: ' + relConfigFile);
        }
        delete this._logger;
    },
    get: function(key, onlyThis){
        var aKey = (key || '').split('.'),
            ret,
            iKey;

        if (aKey[0] === ''){
            return;
        } else if (aKey[0] === '^'){
            if (!this.parent){
                this.logger().error('can`t get value config for a higher level: ' + key);
                return;
            }
            aKey.shift();
            return this.parent.get(aKey.join('.'))
        }

        for (var i = 0; i < aKey.length; i++){
            iKey = aKey[i];
            if (i === 0){
                ret = this._config;
            }
            if (!ret[iKey]){
                if (this.parent){
                    if (onlyThis){
                        return;
                    }
                    return this.parent.get(key);
                }
                this.logger().warn('value not set in config by key: ' + key);
                return;
            } else {
                ret = ret[iKey];
            }
        }
        return ret;
    },
    set: function(key, value){
        var aKey = key.split('.'),
            config = this._config,
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
    getConfig: function(key){
        var config = this, arr = [];
        while(config){
            arr[arr.length] = config;
            config = config.parent;
        }
        var ret = {};
        while(arr.length > 0){
            config = arr.pop();
            ret = merge.recursive(true, ret, config.get(key, true) || {})
        }
        return ret;
    },
    logger: function(){
        if (this._logger){
            return this._logger;
        }
        var logConfig = this.getConfig('log');


        if (logConfig.console.timestamp === 'true'){
            logConfig.console.timestamp = me.timestamp;
        }

        winston.loggers.add(this.id, logConfig);

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
        for (var i = 0; i < aKey.length; i++) {
            iKey = aKey[i];
            parent = current;
            current = parent.childs[iKey];
            if (!current) {
                if (i < (aKey.length - 1)){
                    throw new Error('Defective structure configs: ' + key);
                }else{
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
me.Config = Config;
me.ConfigManager = ConfigManager;
me.timestamp = function(format){
    format = format || "HH:MM:ss";
    var now = new Date();
    return dateFormat(now, format);
};


