/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

var path = require('path');

module.exports = function(grunt){

    var config = require('./lib/config').instance();
    var buildDir = config.pathResolve('directory', 'build.dir', true);

    if (grunt.multik){

        var dependency = grunt.multik.currentDependency;
        var dependDir = dependency.directory;

        if (dependency.name === 'core') {

            grunt.initConfig({
                abcore: {
                    build: {
                        options: {
                            directory: dependDir,
                            buildDir: buildDir
                        }
                    }
                },
                abvendor: {
                    options: {
                        directory: dependDir,
                        buildDir: path.join(buildDir, 'vendor')
                    },
                    init: {
                        options: {
                            install: true
                        }
                    },
                    build: {
                        options: {
                            install: false
                        }
                    }
                },
                watch: {
                    files: [path.join(dependDir, 'src/**/*')],
                    tasks: ['abcore:build']
                }
            });

            grunt.registerTask('init', ['abvendor:init']);
            grunt.registerTask('build', ['abcore:build', 'abvendor:build']);
            grunt.registerTask('buildinst', ['abcore:build', 'abvendor:build']);

        } else if (dependency.group === 'module') {

            grunt.initConfig({
                abmodule: {
                    options: {
                        directory: dependDir
                    },
                    build: {
                        options: {
                            name: dependency.name
                        }
                    }
                },
                abvendor: {
                    options: {
                        directory: dependDir,
                        buildDir: path.join(buildDir, 'vendor')
                    },
                    init: {
                        options: {
                            install: true
                        }
                    },
                    build: {
                        options: {
                            install: false
                        }
                    }
                },
                watch: {
                    files: [path.join(dependDir, 'src/**/*')],
                    tasks: ['abmodule:build']
                }
            });

            grunt.registerTask('init', ['abvendor:init']);
            grunt.registerTask('build', ['abmodule:build', 'abvendor:build']);
            grunt.registerTask('buildinst', ['abmodule:build', 'abvendor:build']);

        } else if (dependency.group === 'template') {

            grunt.initConfig({
                abtemplate: {
                    options: {
                        directory: dependDir
                    },
                    build: {
                        options: {
                            buildDir: path.join(buildDir, 'tt', dependency.name)
                        }
                    }
                }
            });

            grunt.registerTask('init', []);
            grunt.registerTask('build', ['abtemplate:build']);
            grunt.registerTask('buildinst', ['abtemplate:build']);

        } else if (dependency.group === 'installer' && dependency.name === 'install') {

            grunt.initConfig({
                copy: {
                    main: {
                        cwd: path.join(dependDir, 'src'),
                        dest: path.join(buildDir, dependency.name),
                        expand: true,
                        src: ['**/*']
                    }
                }
            });

            grunt.registerTask('init', []);
            grunt.registerTask('build', []);
            grunt.registerTask('buildinst', ['copy']);

        } else if (dependency.group === 'vendor' && dependency.name === 'abricos.js') {

            grunt.initConfig({
                copy: {
                    main: {
                        cwd: path.join(dependDir),
                        dest: path.join(buildDir, 'vendor', dependency.name),
                        expand: true,
                        flatten: true,
                        src: ['src/**/*', 'README.md', 'LICENSE']
                    }
                }
            });

            grunt.registerTask('init', []);
            grunt.registerTask('build', ['copy']);
            grunt.registerTask('buildinst', ['copy']);

        } else {

            grunt.registerTask('default', []);
            grunt.registerTask('init', []);
            grunt.registerTask('build', []);
            grunt.registerTask('buildinst', []);

        }

        grunt.loadNpmTasks('grunt-abricos');

    } else {

        var config = require('./lib/config');

        var tplTaskKeys = [], tplTasks = {},
            tpsDir = path.join(ROOT, 'templates');

        if (grunt.file.isDir(tpsDir)){
            var dirs = fs.readdirSync(tpsDir);
            for (var i = 0; i < dirs.length; i++){
                var dir = dirs[i], key = 'build' + i;
                tplTaskKeys[tplTaskKeys.length] = 'abtemplate:' + key
                tplTasks[key] = {
                    options: {
                        directory: path.join('templates', dir),
                        buildDir: path.join(BUILD_DIR, 'tt', dir),
                        cleanBuildDir: false
                    }
                };
            }
        }

        var tasks = {
            copy: {
                src: {
                    files: [
                        {
                            expand: true,
                            cwd: 'src',
                            src: [
                                '**/*',
                                '.htaccess'
                            ],
                            dest: BUILD_DIR
                        }
                    ]
                }
            },
            watch: {
                files: [
                    'src/**/*',
                    'templates/**/*'
                ],
                tasks: ['build']
            },
            clean: {
                buildinst: path.join(BUILD_DIR, 'includes', 'config.php')
            }
        };

        if (tplTaskKeys.length > 0){
            tasks['abtemplate'] = tplTasks;
        }

        grunt.initConfig(tasks);

        grunt.registerTask('init', []);

        tplTaskKeys[tplTaskKeys.length] = 'copy:src';
        grunt.registerTask('build', tplTaskKeys);

        tplTaskKeys = grunt.util.toArray(tplTaskKeys);

        tplTaskKeys[tplTaskKeys.length] = 'clean:buildinst';
        grunt.registerTask('buildinst', tplTaskKeys);
    }

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');

};
