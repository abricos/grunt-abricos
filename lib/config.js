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


var CONFIG_FILE = "abricos.json";
var DEFAULT_CONFIG = {
    directory: process.cwd(),
    build: {
        "dir": "build"
    },
    logLevel: 'info'
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

        if (fs.exists(configFile)){
            this.logger().debug('loading config file from: ' + configFile);
            try {
                var configJSON = fse.readJSONFileSync(configFile);
                this._config = merge(this._config, configJSON || {});
            } catch (e) {
                this.logger().error('JSON Syntax error in : ' + configFile);
            }
        }else{
            this.logger().debug('config file not found: ' + configFile);
        }
    },
    get: function(key){
        var aKey = key.split('.'),
            ret = this._config;

        for (var i = 0; i < aKey.length; i++){
            ret = ret[aKey[i]];
        }
        return ret;
    },
    logger: function(){
        if (this._logger){
            return this._logger;
        }
        this._logger = winston.loggers.get(this.id);
        return this._logger;
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
        return rootConfig.childs[key] = new Config(key, this, config);
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


