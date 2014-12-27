/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var merge = require("merge");

var me = module.exports;

me.regexp = {
    header: /<!--\[\*\]([\s\S]*?)\[\*\]-->/m,
    newLine: /(\r\n|\n|\r)/gm,
    trim: /^\s+|\s+$/g
};

me.trim = function(s){
    return s.replace(me.regexp.trim, '');
};

me.removeNewLine = function(s){
    return s.replace(me.regexp.newLine, '');
};

me.parseElements = function(tag, str, options){
    var ret = [];
    tag = me.split(tag);
    if (!tag){
        return ret;
    }
    var ri;
    for (var i = 0; i < tag.length; i++){
        ri = me._parseElements(tag[i], str, options);
        ret = ret.concat(ri);
    }
    return ret;
};
me._parseElements = function(tag, str, options){

    options = options || {};

    if (options.removeNewLine){
        str = me.removeNewLine(str);
    }

    var sreg = '\\[' + tag + '\\]([\\s\\S]*?)\\[\\/' + tag + '\\]';
    if (options.named){
        sreg = '\\[' + tag + '=(.*?)\\]([\\s\\S]*?)\\[\\/' + tag + '\\]';
    }

    var reg = new RegExp(sreg, 'i'),
        ret = [], a;
    do {
        a = reg.exec(str);
        if (!a){
            break;
        }
        str = str.replace(reg, '');

        var r;
        if (options.named){
            r = {
                tag: tag,
                name: me.trim(a[1]),
                value: me.trim(a[2])
            };
        } else {
            r = {
                tag: tag,
                value: me.trim(a[1])
            };
        }
        ret[ret.length] = r;

    } while (a);
    return ret;
};

me.split = function(s, del){
    del = del || ',';
    var a = s.split(del), ai,
        ret = [];

    for (var i = 0; i < a.length; i++){
        ai = me.trim(a[i]);

        if (ai.length > 0){
            ret[ret.length] = ai;
        }
    }
    if (ret.length === 0){
        return;
    }

    return ret;
};

me.parseModuleBricks = function(bricks){
    if (!bricks || !bricks.length || bricks.length === 0){
        return;
    }
    var brick, a, ap, ret = [], brickName, prms;
    for (var i = 0; i < bricks.length; i++){
        brick = bricks[i];
        a = me.split(brick, '|');
        if (!a){
            continue;
        }
        brickName = a[0];
        if (a.length === 1){
            ret[ret.length] = brickName;
            continue;
        }
        prms = ret[ret.length] = {
            name: brickName,
            args: {}
        };

        for (var ii = 1; ii < a.length; ii++){
            ap = me.split(a[ii], '=');
            if (!ap || ap.length !== 2){
                continue;
            }
            prms.args[ap[0]] = ap[1];
        }
    }
    return ret;
};

me.parseModule = function(str){
    var parsed = me.parseElements('mod,mcss,mjs', str, {
        named: true
    });

    if (parsed.length === 0){
        return;
    }

    var mods = {}, pi, bricks, css, js;
    for (var i = 0; i < parsed.length; i++){
        pi = parsed[i];
        if (pi.tag === 'mod'){
            bricks = me.split(pi.value);
            if (!bricks){
                continue;
            }
            mods[pi.name] = mods[pi.name] || {};
            mods[pi.name].brick = me.parseModuleBricks(bricks);
        } else if (pi.tag === 'mcss'){
            css = me.split(pi.value);
            if (!css){
                continue;
            }
            mods[pi.name] = mods[pi.name] || {};
            mods[pi.name].css = css;
        } else if (pi.tag === 'mjs'){
            js = me.split(pi.value);
            if (!js){
                continue;
            }
            mods[pi.name] = mods[pi.name] || {};
            mods[pi.name].js = js;
        }
    }

    return mods;
};

me.parseVar = function(str){
    var parsed = me.parseElements('bkvar,v', str, {
        named: true
    });

    if (parsed.length === 0){
        return;
    }

    var vars = {}, pi;
    for (var i = 0; i < parsed.length; i++){
        pi = parsed[i];
        vars[pi.name] = pi.value;
    }

    return vars;
};

me.parseParameter = function(str){
    var parsed = me.parseElements('p', str, {
        named: true
    });

    if (parsed.length === 0){
        return;
    }

    var params = {}, pi;
    for (var i = 0; i < parsed.length; i++){
        pi = parsed[i];
        params[pi.name] = pi.value;
    }

    return params;
};

me.parseScript = function(str){
    var parsed = me.parseElements('script', str, {
        removeNewLine: true
    });
    var scripts = [], pi;
    for (var i = 0; i < parsed.length; i++){
        pi = me.split(parsed[i].value);
        if (pi){
            scripts = scripts.concat(pi);
        }
    }
    if (scripts.length === 0){
        return;
    }

    return scripts;
};

me.parseJSFiles = function(str){
    var parsed = me.parseElements('js', str, {
        removeNewLine: true
    });
    var jsFiles = [], pi;
    for (var i = 0; i < parsed.length; i++){
        pi = me.split(parsed[i].value);
        if (pi){
            jsFiles = jsFiles.concat(pi);
        }
    }
    if (jsFiles.length === 0){
        return;
    }

    return jsFiles;
};

me.parseTemplate = function(str){
    var parsed = me.parseElements('tt', str, {
        named: true
    });

    if (parsed.length === 0){
        return;
    }

    var templates = {}, pi;
    for (var i = 0; i < parsed.length; i++){
        pi = parsed[i];
        templates[pi.name] = pi.value;
    }

    return templates;
};

me.parse = function(content){
    var ret = {},
        a = me.regexp.header.exec(content);

    if (a){
        var strHeader = a[1];
        content = content.replace(me.regexp.header, "");

        ret.script = me.parseScript(strHeader);
        ret.jsFile = me.parseJSFiles(strHeader);
        ret.module = me.parseModule(strHeader);
        ret.var = me.parseVar(strHeader);
        ret.parameter = me.parseParameter(strHeader);
        ret.template = me.parseTemplate(strHeader);
    }

    ret.content = content;

    return ret;
};
