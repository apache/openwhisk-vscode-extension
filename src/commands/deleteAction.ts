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

import { showConfirmMessage } from '../common';
import { WskAction } from '../wskEntity';

export async function deleteAction(action: WskAction): Promise<void> {
    const confirmed = await showConfirmMessage(
        `Are you sure you want to delete '${action.getFullName()}' action?`
    );
    if (confirmed) {
        await action.client.actions
            .delete(action.getFullName())
            .then((target) => {
                vscode.window.showInformationMessage(
                    `Action ${target.name} is deleted succesfully.`
                );
            })
            .catch(() => vscode.window.showErrorMessage(`Failed to delete ${action.label}`));
    }
}
