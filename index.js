/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

var path = require('path');

module.exports = function(grunt){

    if (grunt.multik){

        var dependency = grunt.multik.currentDependency;
        var dependDir = dependency.directory;

        if (dependency.group === 'module'){

            grunt.initConfig({
                abmodule: {
                    options: {
                        directory: dependDir,
                        name: dependency.name
                    },
                    init: {
                        options: {
                            action: 'init'
                        }
                    },
                    build: {
                        options: {
                            action: 'build'
                        }
                    },
                    info: {
                        options: {
                            action: 'info'
                        }
                    },
                    testAPI: {
                        options: {
                            action: 'testAPI'
                        }
                    }
                },
                watch: {
                    files: [
                        path.join(dependDir, 'src/**/*'),
                        path.join(dependDir, 'modules/**/*'),
                        path.join(dependDir, 'templates/**/*')
                    ],
                    tasks: ['abmodule:build']
                }
            });

            grunt.registerTask('init', ['abmodule:init']);
            grunt.registerTask('build', ['abmodule:build']);
            grunt.registerTask('info', ['abmodule:info']);
            grunt.registerTask('testAPI', ['abmodule:testAPI']);

        } else if (dependency.name === 'core'){

            grunt.initConfig({
                abcore: {
                    options: {
                        directory: dependDir
                    },
                    init: {
                        options: {
                            action: 'init'
                        }
                    },
                    build: {
                        options: {
                            action: 'build'
                        }
                    },
                    info: {
                        options: {
                            action: 'info'
                        }
                    }
                },
                watch: {
                    files: [
                        path.join(dependDir, 'src/**/*'),
                        path.join(dependDir, 'modules/**/*'),
                        path.join(dependDir, 'templates/**/*')
                    ],
                    tasks: ['abcore:build']
                }
            });

            grunt.registerTask('init', ['abcore:init']);
            grunt.registerTask('build', ['abcore:build']);
            grunt.registerTask('info', ['abcore:info']);

        } else if (dependency.group === 'template'){

            grunt.initConfig({
                abtemplate: {
                    options: {
                        directory: dependDir,
                        name: dependency.name
                    },
                    init: {
                        options: {
                            action: 'init'
                        }
                    },
                    build: {
                        options: {
                            action: 'build'
                        }
                    },
                    info: {
                        options: {
                            action: 'info'
                        }
                    }
                }
            });

            grunt.registerTask('init', ['abtemplate:init']);
            grunt.registerTask('build', ['abtemplate:build']);
            grunt.registerTask('info', ['abtemplate:info']);

        } else if (dependency.group === 'installer' && dependency.name === 'install'){
/*
            grunt.initConfig({
                copy: {
                    main: {
                        cwd: path.join(dependDir, 'src'),
                        dest: path.join(buildDir, dependency.name),
                        expand: true,
                        src: ['** / *']
                    }
                }
            });

            grunt.registerTask('init', []);
            grunt.registerTask('build', []);
            grunt.registerTask('buildinst', ['copy']);
            /**/
        } else {

            grunt.registerTask('default', []);
            grunt.registerTask('init', []);
            grunt.registerTask('build', []);
            grunt.registerTask('buildinst', []);

        }

    } else {

        grunt.initConfig({
            absite: {
                options: {
                    directory: process.cwd()
                },
                init: {
                    options: {
                        action: 'init'
                    }
                },
                build: {
                    options: {
                        action: 'build'
                    }
                },
                info: {
                    options: {
                        action: 'info'
                    }
                }
            }
        });

        grunt.registerTask('init', ['absite:init']);
        grunt.registerTask('build', ['absite:build']);
        grunt.registerTask('info', ['absite:info']);
    }

    grunt.loadNpmTasks('grunt-abricos');
    grunt.loadNpmTasks('grunt-contrib-watch');

};
