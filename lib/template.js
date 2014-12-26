/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var me = module.exports;

me.regexp = {
    header: /<!--\[\*\]([\s\S]*?)\[\*\]-->/m,
    newLine: /(\r\n|\n|\r)/gm,
    script: /\[script\](.*)\[\/script\]/i,
    module: /\[mod=(.*?)\](.*?)\[\/mod\]/i,
    bkvar: /\[bkvar=(.*?)\]([\s\S]*?)\[\/bkvar\]/i,
    trim: /^\s+|\s+$/g
};

me.removeNewLine = function(s){
    return s.replace(me.regexp.newLine, '');
};

me.trim = function(s){
    return s.replace(me.regexp.trim);
};

me.parseVar = function(str){
    var vars = {},
        a;

    do {
        a = me.regexp.bkvar.exec(str);
        if (!a){
            break;
        }

        vars[a[1]] = a[2];

        str = str.replace(me.regexp.bkvar, '');
    } while (a);

    return vars;
};

me.parseModule = function(str){
    str = me.removeNewLine(str);
    var mods = {},
        a;

    var setBrick = function(modName, s){
        var mod = mods[modName] = mods[modName] || [];
        mod[mod.length] = s;
    };

    do {
        a = me.regexp.module.exec(str);
        if (!a){
            break;
        }

        var modName = a[1],
            ta = a[2].split(','),
            brick;

        for (var i = 0; i < ta.length; i++){
            brick = me.trim(ta[i]);
            if (brick.length > 0){
                setBrick(modName, brick);
            }
        }

        str = str.replace(me.regexp.module, '');
    } while (a);

    if (mods.length === 0){
        return;
    }
    return mods;
};

me.parseScript = function(str){
    str = me.removeNewLine(str);

    var a = me.regexp.script.exec(str);
    if (!a){
        return;
    }
    return a[1];
};

me.parse = function(content){
    var ret = {},
        a = me.regexp.header.exec(content);

    if (a){
        var strHeader = a[1];

        content = content.replace(me.regexp.header, "");

        ret.script = me.parseScript(strHeader);
        ret.module = me.parseModule(strHeader);
        ret.var = me.parseVar(strHeader);
    }

    ret.content = content;

    return ret;

};

