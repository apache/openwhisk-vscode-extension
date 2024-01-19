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
import { WskAction } from '../wskEntity';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { Exec } from 'openwhisk';
import { showConfirmMessage } from '../common';

const actionEditMap: { [key: string]: WskAction } = {};
export async function editAction(action: WskAction): Promise<void> {
    let dir = path.join(os.tmpdir(), 'openwhisk-vscode', 'action');
    if (action.packageDesc && action.packageDesc.name) {
        dir = path.join(dir, action.packageDesc.name);
    }
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const localFilePath = dir + '/' + action.label + action.fileExtension;
    if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
    }

    const content = await action.client.actions.get(
        WskAction.removeExtension(action.getFullName())
    );
    if (content.exec.kind === 'sequence') {
        vscode.window.showErrorMessage("Can't edit sequence action type");
        return;
    }

    if ((content.exec as Exec).binary) {
        vscode.window.showErrorMessage("Can't edit binary action code");
        return;
    }
    if ((content.exec.kind as string) === 'blackbox' && !(content.exec as Exec).code) {
        vscode.window.showErrorMessage("Can't edit blackbox action without action code");
        return;
    }
    if ((content.exec as Exec).code) {
        fs.writeFileSync(localFilePath, (content.exec as Exec).code);
    }

    vscode.workspace.openTextDocument(localFilePath).then((textDocument: vscode.TextDocument) => {
        vscode.window
            .showTextDocument(textDocument, { preview: false })
            .then((textEditor: vscode.TextEditor) => {
                actionEditMap[textEditor.document.uri.toString()] = action;
            });
    });
}

vscode.workspace.onDidSaveTextDocument(async (doc: vscode.TextDocument) => {
    const action: WskAction = actionEditMap[doc.uri.toString()];
    if (action) {
        const confirmed = await showConfirmMessage(
            `Are you sure you want to update action code?`,
            'Update'
        );
        if (confirmed) {
            await action.client.actions.update({
                name: action.getFullName(),
                action: doc.getText(),
                kind: action.kind,
            });
            vscode.window.showInformationMessage(`The action code is updated`);
        }
    }
});
