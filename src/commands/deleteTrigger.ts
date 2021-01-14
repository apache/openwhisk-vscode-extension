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

import { showConfirmMessage } from '../common';
import { WskTrigger } from '../wskEntity';

export async function deleteTrigger(trigger: WskTrigger): Promise<void> {
    const triggerName = trigger.triggerDesc.name;
    if (!triggerName) {
        return;
    }
    const confirmed = await showConfirmMessage(
        `Are you sure you want to delete '${triggerName}' trigger?`
    );
    if (confirmed) {
        await trigger.client.triggers
            .delete(triggerName)
            .then(() => {
                vscode.window.showInformationMessage(
                    `Trigger ${triggerName} is deleted succesfully.`
                );
            })
            .catch(() => vscode.window.showErrorMessage(`Failed to delete ${triggerName}`));
    }
}
