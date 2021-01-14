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
import * as fs from 'fs';

import { WskPackage, WskNamespace } from '../wskEntity';
import { sampleCodePath, runtimes } from '../constant/runtimes';

export async function createAction(entity: WskPackage | WskNamespace) {
    const actionName = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        prompt: 'Create new action',
        placeHolder: 'Enter action name here',
    });
    if (!actionName) {
        return;
    }

    // prepend package name
    let name = actionName;
    if (entity instanceof WskPackage) {
        name = `${entity.packageDesc.name}/${actionName}`;
    }

    // show runtime kind list
    const items: vscode.QuickPickItem[] = [];
    runtimes.forEach((r) => {
        r.versions.forEach((version) => {
            items.push({
                label: `${r.kind}:${version}`,
            });
        });
    });

    const kind = await vscode.window.showQuickPick(items, {
        canPickMany: false,
        placeHolder: 'Select runtime',
    });

    if (kind) {
        const kindWithoutVersion = kind.label.split(':')[0];
        const codePath = sampleCodePath[kindWithoutVersion];
        const content = fs.readFileSync(codePath, { encoding: 'utf8' });
        try {
            await entity.client.actions.create({
                name: name,
                action: content,
                // @ts-ignore
                kind: kind.label,
            });
        } catch (e) {
            if (e.error && e.error.error) {
                vscode.window.showErrorMessage(e.error.error);
            }
        }
    }
}
