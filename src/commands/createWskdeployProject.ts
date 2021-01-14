/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as vscode from 'vscode';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

import { TemplatePath } from '../constant/template';
import { showConfirmMessage } from '../common';

function getTemplateFiles(dir: string): string[] {
    const files = fs.readdirSync(dir, {
        withFileTypes: true,
    });
    let fileList: string[] = [];
    files.forEach((f) => {
        if (f.isDirectory()) {
            const files = getTemplateFiles(resolve(dir, f.name)).map((_f) =>
                path.join('.', f.name, _f)
            );
            fileList = [...fileList, ...files];
            return;
        }
        fileList.push(f.name);
    });
    return fileList;
}

export async function createWskdeployProject(): Promise<void> {
    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage('Open a workspace first to create a wskdeploy project.');
        return;
    }
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const templateFiles = getTemplateFiles(TemplatePath.Minimal.root);

    try {
        const fileListString = templateFiles.map((f) => `    - ${f}`).join('\n');
        const confirmed = await showConfirmMessage(
            `Are you sure you want to create wskdeploy project in your workspace?\n
    The following file will be created:
${fileListString}`,
            'Create'
        );
        if (!confirmed) {
            return;
        }

        templateFiles.forEach((f) => {
            if (fs.existsSync(resolve(workspacePath, f))) {
                throw new Error(`Failed to create a template file. The ${f} file already exists`);
            }
        });
        templateFiles.forEach(async (f) => {
            const templateFilePath = vscode.Uri.file(path.resolve(TemplatePath.Minimal.root, f));
            const targetFilePath = vscode.Uri.file(path.resolve(workspacePath, f));
            await vscode.workspace.fs.copy(templateFilePath, targetFilePath);
        });
    } catch (e) {
        if (e instanceof Error) {
            vscode.window.showErrorMessage(e.message);
        }
    }
}
