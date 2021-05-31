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
import {
    WskEntityProvider,
    addEndpoint,
    addNamespace,
    renameEndpoint,
    removeEndpoint,
    removeNamespace,
} from './entityExplorer';
import { ActionCodeProvider, ActivationProvider } from './wskContent';
import { WskAction, WskTrigger, WskEndpoint, WskNamespace, WskPackage } from './wskEntity';
import { WskActivationProvider, showActivationDetails } from './activationList';
import { WskDeployManifestProvider } from './manifestList';
import { WskdeployYamlCompletionItemProvider } from './wskdeployYamlCompletion';
import * as commands from './commands';
import { showConfirmMessage } from './common';

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    const wskEntityProvider = new WskEntityProvider(context);
    const wskEntityView = vscode.window.createTreeView('wskEntities', {
        treeDataProvider: wskEntityProvider,
    });
    wskEntityView.onDidChangeVisibility(() => wskEntityProvider.refresh());
    const disp = vscode.commands.registerCommand('wskEntities.refreshEntry', () =>
        wskEntityProvider.refresh()
    );

    const wskActivationProvider = new WskActivationProvider(context, wskEntityView);
    vscode.window.registerTreeDataProvider('wskActivations', wskActivationProvider);

    // `a`ction, `p`ackage, `t`rigger, `r`ule
    const triggerCharacters = 'aptr'.split('');
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'yaml' },
            new WskdeployYamlCompletionItemProvider(),
            ...triggerCharacters
        )
    );

    // register TextDocumentContentProviders
    const actionCodeProvider = new ActionCodeProvider();
    const activationProvider = new ActivationProvider();
    vscode.workspace.registerTextDocumentContentProvider(
        ActionCodeProvider.scheme,
        actionCodeProvider
    );
    vscode.workspace.registerTextDocumentContentProvider(
        ActivationProvider.scheme,
        activationProvider
    );

    vscode.commands.registerCommand('wskAction.openActionCode', async (action: WskAction) => {
        commands.openActionCode(action);
    });

    vscode.commands.registerCommand('wskAction.editActionMetadata', async (action: WskAction) => {
        commands.editActionMetadata(action, context);
    });

    vscode.commands.registerCommand('wskAction.editActionCode', async (action: WskAction) => {
        commands.editAction(action);
    });

    vscode.commands.registerCommand('wskAction.deleteAction', async (action: WskAction) => {
        await commands.deleteAction(action);
        wskEntityProvider.refresh();
    });

    vscode.commands.registerCommand('wskAction.invokeAction', (action) =>
        commands.invokeAction(action, context)
    );

    vscode.commands.registerCommand('wskTrigger.deleteTrigger', async (trigger: WskTrigger) => {
        await commands.deleteTrigger(trigger);
        wskEntityProvider.refresh();
    });

    vscode.commands.registerCommand('wskEntities.addEndpoint', async () => {
        await addEndpoint(context);
        wskEntityProvider.refresh();
    });

    vscode.commands.registerCommand('wskEndpoint.addNamespace', async (endpoint: WskEndpoint) => {
        await addNamespace(endpoint.apihost, context);
        wskEntityProvider.refresh();
    });

    vscode.commands.registerCommand('wskEndpoint.rename', async (endpoint: WskEndpoint) => {
        await renameEndpoint(endpoint.apihost, context);
        wskEntityProvider.refresh();
    });

    vscode.commands.registerCommand('wskTrigger.showInfo', async (trigger: WskTrigger) => {
        commands.showTriggerInfo(trigger, context);
    });

    vscode.commands.registerCommand('wskActivation.showDetails', showActivationDetails);

    vscode.commands.registerCommand('wskActivations.refresh', () =>
        wskActivationProvider.refresh()
    );

    vscode.commands.registerCommand('wskEndpoint.remove', async (endpoint: WskEndpoint) => {
        const confirmed = await showConfirmMessage(
            `Are you sure you want to remove '${endpoint.label}' endpoint from the explorer?`
        );
        if (confirmed) {
            await removeEndpoint(endpoint, context);
            wskEntityProvider.refresh();
        }
    });

    vscode.commands.registerCommand('wskNamespace.remove', async (namespace: WskNamespace) => {
        const confirmed = await showConfirmMessage(
            `Are you sure you want to remove '${namespace.label}' namespace from the explorer?`
        );
        if (confirmed) {
            await removeNamespace(namespace, context);
            wskEntityProvider.refresh();
        }
    });

    vscode.commands.registerCommand(
        'wskNamespace.createAction',
        async (namespace: WskNamespace) => {
            await commands.createAction(namespace);
            wskEntityProvider.refresh();
        }
    );

    vscode.commands.registerCommand(
        'wskNamespace.createPackage',
        async (namespace: WskNamespace) => {
            await commands.createPackage(namespace);
            wskEntityProvider.refresh();
        }
    );

    vscode.commands.registerCommand('wskPackage.createAction', async (pkg: WskPackage) => {
        await commands.createAction(pkg);
        wskEntityProvider.refresh();
    });

    vscode.commands.registerCommand('wskPackage.editPackageMetadata', async (pkg: WskPackage) => {
        commands.editPackageMetadata(pkg, context);
    });

    vscode.commands.registerCommand('wskPackage.deletePackage', async (pkg: WskPackage) => {
        await commands.deletePackage(pkg);
        wskEntityProvider.refresh();
    });

    vscode.commands.registerCommand('wskdeploy.createProject', () =>
        commands.createWskdeployProject()
    );

    vscode.window.registerTreeDataProvider('wskdeploy', new WskDeployManifestProvider(context));

    context.subscriptions.push(disp);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
