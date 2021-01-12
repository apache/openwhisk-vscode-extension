# What is wskdeploy

`wskdeploy` is a utility to help you deploy any part of the OpenWhisk programming model using a Manifest file written in YAML. Use it to deploy all your OpenWhisk Packages, Actions, Triggers, and Rules!

## Downloading wskdeploy

Binaries of wskdeploy are available for download on the project's GitHub release page.
https://github.com/apache/openwhisk-wskdeploy/releases

## Getting started

You can find various examples in the official documentation.
https://github.com/apache/openwhisk-wskdeploy/blob/master/docs/programming_guide.md#getting-started


# The "Hello World" sample wskdeploy project

## Files included

The following files are included in the sample project by default:
- manifest.yaml : Manifest file for wskdeploy
- src/index.js : Sample action code
- src/index.test.js : Test code for the action code
- src/package.json : package.json for NPM

## How to deploy the project

You can run the deploy command from the wskdeploy manifests explorer in the VSCode sidebar or run the following command in the terminal:

```
$ wskdeploy -m manifest.yaml
```

### Including dependencies

The sample project deploys only the function code in the index.js file. But sometimes you need to add NPM or your dependencies.

In this case, simply use a directory path as a function endpoint to compress and deploy all the files.

```yaml
packages:
  hello_world_package:
    actions:
      hello_world:
        # use src directory to deploy the action
        # or deploy single code (function: index.js)
        function: src
        runtime: nodejs:default
```

Install NPM dependency modules and deploy wskdeploy project:
(Note that wskdeploy does not automatically install npm dependencies.)

```
$ cd src && npm install --production
$ wskdeploy -m manifest.yaml
```

## How to invoke the action

You can invoke the action in the openwhisk explorer located in the activity bar or invoke it with the following command:

```
$ wsk action invoke hello_world_package/hello_world --blocking
```

## Test action code in your local environment

The jest dependency is included by default. So you can test with `npm run test` command.

```
$ cd src
$ npm install
$ npm run test
```