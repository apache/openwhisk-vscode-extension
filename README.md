# OpenWhisk VSCode Extension

An **openwhisk-vscode-extension** is an open-source VSCode extension for [Apache OpenWhisk](https://openwhisk.apache.org/). It manages the wskdeploy manifest file and makes deployment easy. You can also create and update actions and packages in VSCode.

Try creating and editing your action code in the VSCode!

## Prerequisites

Install the dependencies below to use full features:

- [vscode](https://code.visualstudio.com/) >= 1.41.0
- [wskdeploy](https://github.com/apache/openwhisk-wskdeploy/releases)

This extension finds the `.wskprops` configuration file located in the home path and connects to the Openwhisk server automatically. Set up your configuration referred to the [cli docs](https://github.com/apache/openwhisk/blob/master/docs/cli.md#openwhisk-cli).

## Features

### OpenWhisk Explorer

- Explore all entities in your endpoints/namespaces.
    - The .wskprops file is automatically registered.
    - You can add the API host manually.
    - You can add the namespace manually by API auth key.
- Show the action code with syntax highlighting.
- Edit the action code on the remote server.
- Invoke the action remotely and get the activation result.
- Show a list of actions related to the sequence action.
- Show information about the trigger and related rules.
- Show activations related to the action (Same as `wsk activation list <action>`).
- Show detailed information of the activation (Same as `wsk activation get <activation_id>`).
- Update parameters and annotations of the action, package, and trigger.

### Manifest View (in the workspace explorer)

- List up manifest YAML files in the workspace.
- Deploy/Undeploy OpenWhisk packages with manifest (via wskdeploy).
    - Deploy with the deployment file.
    - Deploy with multiple credentials.

## Commands
This extension contributes the following commands to the Command palette.

- `Create a wskdeploy project`: creates a wskdeploy project

## How to debug in your local

```bash
git clone https://github.com/apache/openwhisk-vscode-extension.git
code ./openwhisk-vscode-extension # Open openwhisk-vscode-extension in VSCode
```

Press `F5` button(run debug)  

Learn more about debugging [here](https://github.com/apache/openwhisk-vscode-extension/blob/master/vsc-extension-quickstart.md)

## License

```
Licensed to the Apache Software Foundation (ASF) under one or more
contributor license agreements.  See the NOTICE file distributed with
this work for additional information regarding copyright ownership.
The ASF licenses this file to You under the Apache License, Version 2.0
(the "License"); you may not use this file except in compliance with
the License.  You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Third-party Product Acknowledgement 

Portions of this product include SVG files developed by the XEIcon project (https://github.com/xpressengine/XEIcon).
 
 - Dark theme: https://github.com/apache/openwhisk-vscode-extension/tree/master/resource/dark
 - Light theme: https://github.com/apache/openwhisk-vscode-extension/tree/master/resource/light

Those files are distributed under the XEIcon license (https://github.com/xpressengine/XEIcon#license).   
