/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var treeConfig = require('tree-config'),
    Config = treeConfig.Config;

module.exports = treeConfig;

Config.MY_CONFIG_FILE = "myabricos.json";
Config.ROOT_DEFAULT_OPTIONS = {
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
    },
    api: {
        module: {
            pathTemplate: '<%= directory %>/abricos.src/modules/{v#module}/lib/api/'
        }
    }
};
Config.IMPORTS = [{
    key: 'package',
    file: 'package.json'
}, {
    key: 'abricos',
    file: '.abricos.json'
}];
