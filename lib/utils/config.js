'use strict';

var path = require('path');
var config = require('tree-config');
var configLogger = require('tree-config-logger');

config.PluginManager.register('logger', configLogger);
config.logger = function(){
    return this.plugins.get('logger');
};

var defaultSettings = {
    directory: process.cwd(),
    _libDirectory: path.join(__dirname, '..', '..'),
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
    },
    api: {
        module: {
            pathTemplate: '<%= directory %>/abricos.src/modules/{v#module}/lib/api/'
        }
    }
};

config.configure({
    sources: [
        {
            type: 'json',
            src: '.abricos.json'
        }, {
            type: 'json',
            key: 'package',
            src: 'package.json'
        }, {
            type: 'json',
            src: 'myabricos.json'
        }
    ]
});

config.setDefaults(defaultSettings);

module.exports = config;
