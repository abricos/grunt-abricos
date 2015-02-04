'use strict';

var path = require('path');
var treeConfig = require('tree-config');

treeConfig.configure({
    CONFIG_FILE: ".abricos.json",

    OVERRIDE_CONFIG_FILE: "myabricos.json",

    IMPORTS: [{
        key: 'package',
        file: 'package.json'
    }, {
        key: 'abricos',
        file: '.abricos.json'
    }],

    ROOT_OPTIONS: {
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
    }
});

module.exports = treeConfig;

