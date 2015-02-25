/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var path = require('path');

var me = module.exports;

me.regexp = {
    version: /\{C\#VERSION\}/g,
    assets: /\{C\#ASSETS\}/g,
    overAssets: /\{C\#ASSETS:([M|T]):(.*)\}/,
    rootAssets: /\{C\#ASSETS:R\}/g
};

me.parseVersion = function(config, content){
    var version = config.get('package.version');

    content = content.replace(me.regexp.version, version);

    return content;
};

me.parseAssets = function(config, content){
    var rootBuildDir = config.get('^^.build.dir'),
        buildDir = config.get('build.dir');

    var relBuildDir = path.relative(rootBuildDir, buildDir),
        webAssetsPath = '/' + relBuildDir + '/assets',
        webRootAssetsPath = '/assets';

    content = content.replace(me.regexp.assets, webAssetsPath);
    content = content.replace(me.regexp.rootAssets, webRootAssetsPath);

    var a;
    do {
        a = me.regexp.overAssets.exec(content);
        if (!a){
            break;
        }

        switch (a[1]) {
            case 'M':
                webAssetsPath = '/modules/' + a[2] + '/assets';
                break;
            case 'T':
                webAssetsPath = '/template/' + a[2] + '/assets';
                break;
            default :
                webAssetsPath = '/assets';
                break;
        }
        content = content.replace(a[0], webAssetsPath);

    } while (a);

    return content;
};

me.parse = function(config, content){

    content = me.parseVersion(config, content);
    content = me.parseAssets(config, content);

    return content;
};
