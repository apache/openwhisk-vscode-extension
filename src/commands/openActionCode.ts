/**
 * Copyright 2020-present NAVER Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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
import * as openwhisk from 'openwhisk';
import * as fs from 'fs';
import * as path from 'path';
import { WskAction } from '../wskEntity';
import { WEBVIEW_TEMPLATE_PATH } from '../constant/path';

async function showSequenceActionInfo(sequenceAction: WskAction): Promise<void> {
    const action = await sequenceAction.client.actions.get(sequenceAction.getFullName());
    const panel = vscode.window.createWebviewPanel(
        'showSequenceActionInfo',
        `Show Action: ${action.name}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
        }
    );
    panel.webview.html = await fs.promises.readFile(
        path.resolve(WEBVIEW_TEMPLATE_PATH, 'sequenceActionInfo.html'),
        'utf-8'
    );
    panel.webview.postMessage({
        command: 'getData',
        actions: (action.exec as openwhisk.Sequence).components,
    });
}

export async function openActionCode(action: WskAction): Promise<void> {
    if (action.kind === 'sequence') {
        try {
            showSequenceActionInfo(action);
        } catch (e) {
            vscode.window.showErrorMessage(`Can't open ${action.label}: ` + e);
        }
    } else if (action.resourceUri) {
        const title = `${action.getFullName()} (Preview mode)`;
        vscode.commands.executeCommand<void>(
            'vscode.open',
            action.resourceUri,
            {
                preview: true,
            },
            title
        );
    }
}
