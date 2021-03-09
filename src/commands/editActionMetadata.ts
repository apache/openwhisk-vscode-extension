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

import { WskAction } from '../wskEntity';
import { convertKeyValToObj } from '../common';
import { openMetadataEditor } from './common/openMetadataEditor';
import { Limits } from 'openwhisk';

export async function editActionMetadata(
    action: WskAction,
    context: vscode.ExtensionContext
): Promise<void> {
    const a = await action.getRemoteAction();
    const parameters = convertKeyValToObj(a.parameters || []);
    const annotations = convertKeyValToObj(a.annotations || []);
    const updateActionMetadata = async (
        params: object,
        annotations: object,
        limits: Limits | undefined
    ): Promise<void> => {
        try {
            await action.client.actions.update({
                name: action.getFullName(),
                params: params,
                annotations: annotations,
                limits: limits,
            });
            vscode.window.showInformationMessage('The action is updated successfully.');
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to update the action (${e.message})`);
        }
    };

    await openMetadataEditor(
        'editActionMetadata',
        `Edit action metadata: ${action.actionDesc.name}`,
        context,
        parameters,
        annotations,
        a.limits,
        updateActionMetadata
    );
}
