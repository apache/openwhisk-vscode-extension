/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as retry from 'async-retry';

import { WskAction } from '../wskEntity';
import { resolve } from 'path';
import * as path from 'path';
import openwhisk = require('openwhisk');
import { getAuthFromUri } from '../wskContent';
import { WEBVIEW_TEMPLATE_PATH } from '../constant/path';

interface ActionInvocationMeata {
    client: openwhisk.Client;
    fullname: string;
}

// use global output channel
const output = vscode.window.createOutputChannel('Invoke Result');
let lastActivationId = '';

/**
 * It fetches activation logs asynchronously and appends it to the invoke result panel.
 * @param client openwhisk client
 * @param activation activation result
 */
async function printLogs(client: openwhisk.Client, activation: openwhisk.Dict): Promise<void> {
    const res = await retry(
        async () => {
            return await client.activations.logs(activation.activationId);
        },
        { retries: 5 }
    );
    if (lastActivationId === activation.activationId) {
        output.append(res.logs.join('\n'));
    }
}

/**
 * It prints activation results without logs.
 * @param client openwhisk client
 * @param activation  activation result
 */
function printActivationResult(client: openwhisk.Client, activation: openwhisk.Dict): void {
    lastActivationId = activation.activationId;
    printLogs(client, activation);
    output.clear();
    output.append(`Response:\n${JSON.stringify(activation.response.result)}\n\n`);
    output.append(`ActivationID:\n${activation.activationId}\n\n`);
    output.append(`Logs:\n`);
    output.show();
}

function setParameters(panel: vscode.WebviewPanel, params: string): Thenable<boolean> {
    return panel.webview.postMessage({ command: 'getParameters', params: params });
}

export async function invokeAction(
    item: WskAction | vscode.Uri,
    context: vscode.ExtensionContext
): Promise<void> {
    let invocationMeta: ActionInvocationMeata;
    if (item instanceof vscode.Uri) {
        invocationMeta = {
            client: openwhisk(getAuthFromUri(item)),
            fullname: WskAction.removeExtension(item.path),
        };
    } else {
        invocationMeta = {
            client: item.client,
            fullname: item.getFullName(),
        };
    }

    const panel = vscode.window.createWebviewPanel(
        'invokeAction',
        `Invoke Action: ${invocationMeta.fullname}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'node_modules'))],
        }
    );

    const nodeModulesDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'node_modules'));
    const nodeModulePath = panel.webview.asWebviewUri(nodeModulesDiskPath);

    const metadata = await invocationMeta.client.actions.get(invocationMeta.fullname);
    const html = await fs.promises.readFile(
        resolve(WEBVIEW_TEMPLATE_PATH, 'invokeAction.html'),
        'utf-8'
    );

    panel.webview.html = html
        .replace(/{{nodeModulePath}}/gi, nodeModulePath.toString())
        .replace(/{{actionName}}/gi, invocationMeta.fullname);

    let defaultParameters = '';
    if (metadata.parameters) {
        defaultParameters = JSON.stringify(
            metadata.parameters.reduce((acc: { [key: string]: string }, cur) => {
                acc[cur.key] = cur.value;
                return acc;
            }, {}),
            null,
            4
        );
    }
    setParameters(panel, defaultParameters);

    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'invoke') {
            try {
                const activation = await invocationMeta.client.actions.invoke({
                    name: invocationMeta.fullname,
                    params: JSON.parse(message.parameters),
                    blocking: true,
                    result: false,
                });
                printActivationResult(invocationMeta.client, activation);
            } catch (e) {
                if (e.error.activationId) {
                    printActivationResult(invocationMeta.client, e.error);
                } else {
                    vscode.window.showErrorMessage(e);
                }
            }
        }
    });
}
