# grunt-abricos

> Grunt plugin for Abricos Platform

## Getting Started
This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-abricos --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-abricos');
```

## The "abcore" task

### Overview
In your project's Gruntfile, add a section named `abcore` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  abcore: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### options.directory
Type: `String`
Default value: `'.'`

Project directory.

#### options.buildDir
Type: `String`
Default value: `'build'`

Building directory.


## The "abvendor" task

### Overview
Sets the dependent party components.

In your project's Gruntfile, add a section named `abvendor` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  abvendor: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### options.directory
Type: `String`
Default value: `'.'`

Project directory.

#### options.buildDir
Type: `String`
Default value: `'build/vendor'`

Building directory.

#### options.cleanBuildDir
Type: `Boolean`
Default value: `true`

Clean directory before building project.

#### options.install
Type: `Boolean`
Default value: `true`

Download dependent components.


## The "abmodule" task

### Overview
In your project's Gruntfile, add a section named `abmodule` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  abmodule: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### options.directory
Type: `String`
Default value: `'.'`

Project directory.

#### options.buildDir
Type: `String`
Default value: `'build'`

Building directory.

#### options.cleanBuildDir
Type: `Boolean`
Default value: `true`

Clean directory before building project.


## The "abtemplate" task

### Overview
In your project's Gruntfile, add a section named `abtemplate` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  abtemplate: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### options.directory
Type: `String`
Default value: `'.'`

Project directory.

#### options.buildDir
Type: `String`
Default value: `'build'`

Building directory.

#### options.cleanBuildDir
Type: `Boolean`
Default value: `true`

Clean directory before building project.


## Release History


### 0.1.3 - 2014-02-27

- Build LESS in Abricos Template


### 0.1.1 - 2014-02-20

- Build LESS in Abricos Module


### 0.1.0 - 2014-02-10

 - First official release for Grunt 0.4.2.
