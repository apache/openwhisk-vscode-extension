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
import * as path from 'path';
import * as fs from 'fs';
import { WEBVIEW_TEMPLATE_PATH } from '../../constant/path';
import { Limits } from 'openwhisk';

export async function openMetadataEditor(
    viewType: string,
    tabTitle: string,
    context: vscode.ExtensionContext,
    parameters: Record<string, any>,
    annotations: Record<string, any>,
    limits: Limits | undefined,
    update: (parameter: object, annotation: object, limits: Limits | undefined) => Promise<void>
): Promise<void> {
    const panel = vscode.window.createWebviewPanel(viewType, tabTitle, vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
    });
    const nodeModulesDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'node_modules'));
    const nodeModulePath = panel.webview.asWebviewUri(nodeModulesDiskPath);

    const webviewTemplateDiskPath = vscode.Uri.file(WEBVIEW_TEMPLATE_PATH);
    const webviewTemplatePath = panel.webview.asWebviewUri(webviewTemplateDiskPath);

    // render webview html
    const html = await fs.promises.readFile(
        path.resolve(WEBVIEW_TEMPLATE_PATH, 'metadataEditor.html'),
        'utf-8'
    );

    // set container className
    let className = '';
    if (limits) {
        className += 'has-limits';
    }

    panel.webview.html = html
        .replace(/{{nodeModulePath}}/gi, nodeModulePath.toString())
        .replace(/{{webviewTemplatePath}}/gi, webviewTemplatePath.toString())
        .replace(/{{className}}/gi, className)
        .replace(/{{title}}/gi, tabTitle);

    // add message litener
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'initialized') {
            panel.webview.postMessage({
                command: 'setEditor',
                parameters: JSON.stringify(parameters),
                annotations: JSON.stringify(annotations),
                limits: limits,
            });
        } else if (message.command === 'update') {
            await update(
                JSON.parse(message.parameters),
                JSON.parse(message.annotations),
                message.limits
            );
        }
    });
}
