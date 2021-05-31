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
import * as openwhisk from 'openwhisk';
import * as path from 'path';

import { WskTrigger } from '../wskEntity';
import { convertObjToKeyVal, convertKeyValToObj } from '../common';
import { WEBVIEW_TEMPLATE_PATH } from '../constant/path';

export async function showTriggerInfo(
    trigger: WskTrigger,
    context: vscode.ExtensionContext
): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
        'showTriggerInfo',
        `Trigger: ${trigger.label}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
        }
    );

    const nodeModulesDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'node_modules'));
    const nodeModulePath = panel.webview.asWebviewUri(nodeModulesDiskPath);
    const webviewTemplateDiskPath = vscode.Uri.file(WEBVIEW_TEMPLATE_PATH);
    const webviewTemplatePath = panel.webview.asWebviewUri(webviewTemplateDiskPath);

    const html = await fs.promises.readFile(
        path.resolve(WEBVIEW_TEMPLATE_PATH, 'triggerInfo.html'),
        'utf-8'
    );

    panel.webview.html = html
        .replace(/{{nodeModulePath}}/gi, nodeModulePath.toString())
        .replace(/{{webviewTemplatePath}}/gi, webviewTemplatePath.toString());

    let triggerDesc: openwhisk.Trigger | null;

    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'initialized') {
            if (!triggerDesc) {
                triggerDesc = await trigger.client.triggers.get(trigger.label);
            }
            let params = '';
            let annotations = '';
            if (triggerDesc.parameters) {
                params = JSON.stringify(convertKeyValToObj(triggerDesc.parameters), null, 4);
            }
            if (triggerDesc.annotations) {
                annotations = JSON.stringify(convertKeyValToObj(triggerDesc.annotations), null, 4);
            }
            panel.webview.postMessage({
                command: 'getData',
                name: triggerDesc.name,
                params: params,
                annotations: annotations,
                rules: triggerDesc.rules,
            });
        }

        if (message.command === 'update') {
            const annotationObject = JSON.parse(message.annotations);
            const parameterObject = JSON.parse(message.parameters);
            await trigger.client.triggers.update({
                name: trigger.label,
                trigger: {
                    annotations: convertObjToKeyVal(annotationObject),
                    parameters: convertObjToKeyVal(parameterObject),
                },
            });
            vscode.window.showInformationMessage('The trigger is updated successfully.');
            triggerDesc = null;
        }
    });
}
