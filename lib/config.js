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


var CONFIG_FILE = "abricosgrunt.json";
var DEFAULT_CONFIG = {
    directory: process.cwd(),
    build: {
        dir: "build"
    },
    temp: {
        dir: "build_temp"
    },
    logLevel: 'info',
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
    this._id = id || "_root_";
    this._parent = parent;
    this._config = config || DEFAULT_CONFIG;
    this.init(config);
};
Config.prototype = {
    init: function(config){
        this._config = merge(this._config, config || {});
        this.logger().debug('initializing config');
        this.load();
    },
    load: function(){
        var config = this._config,
            configFile = path.join(config.directory, CONFIG_FILE);

        if (fs.existsSync(configFile)){
            this.logger().debug('loading config file from: ' + configFile);
            try {
                var configJSON = fse.readJSONFileSync(configFile);
                this._config = merge(this._config, configJSON || {});
            } catch (e) {
                this.logger().error('JSON Syntax error in : ' + configFile);
            }
        } else {
            this.logger().debug('config file not found: ' + configFile);
        }
    },
    get: function(key){
        var aKey = (key || '').split('.'),
            ret,
            iKey;

        if (aKey[0] === ''){
            return;
        } else if (aKey[0] === '^'){
            if (!this._parent){
                this.logger().error('can`t get value config for a higher level: ' + key);
                return;
            }
            aKey.shift();
            return this._parent.get(aKey.join('.'))
        }

        for (var i = 0; i < aKey.length; i++){
            iKey = aKey[i];
            if (i === 0){
                ret = this._config;
            }
            if (!ret[iKey]){
                if (this._parent){
                    return this._parent.get(key);
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
    logger: function(){
        if (this._logger){
            return this._logger;
        }
        this._logger = winston.loggers.get(this.id);
        return this._logger;
    },
    pathResolve: function(keyFrom, keyTo, isSet){
        var pathFrom = this.get(keyFrom);
        var pathTo = this.get(keyTo);
        if (!pathFrom || !pathTo){
            this.logger().debug("config empty value in function pathResolve");
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
                childs: []
            }
        }
        var rootConfig = this._rootConfig;

        if (!key){
            return rootConfig.instance;
        }

        if (rootConfig.childs[key]){
            return rootConfig.childs[key];
        }
        return rootConfig.childs[key] = new Config(key, rootConfig.instance, config);
    }
};

module.exports = {
    instance: function(key, config){
        if (!this._manager){
            this._manager = new this.ConfigManager();
        }
        return this._manager.instance(key, config);
    },
    Config: Config,
    ConfigManager: ConfigManager
}


