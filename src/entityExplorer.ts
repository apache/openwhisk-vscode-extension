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
import * as openwhisk from 'openwhisk';
import * as request from 'request-promise-native';
import { getLocalAuthInfo } from './authentication';
import { StorageManager, SavedNamespaceState } from './storage';
import {
    WskEntity,
    WskEndpoint,
    WskNamespace,
    WskPackage,
    createWskPackage,
    createWskTrigger,
    createWskAction,
} from './wskEntity';

export class WskEntityProvider implements vscode.TreeDataProvider<WskEntity> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        WskEntity | undefined
    > = new vscode.EventEmitter<WskEntity | undefined>();
    readonly onDidChangeTreeData: vscode.Event<WskEntity | undefined> = this._onDidChangeTreeData
        .event;

    private storageManager: StorageManager;

    constructor(public context: vscode.ExtensionContext) {
        this.storageManager = new StorageManager(context.globalState);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    async getTreeItem(element: WskEntity): Promise<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: WskEntity): Promise<WskEntity[]> {
        const listOptions = { limit: 0 };
        const compareName = (a: openwhisk.Desc, b: openwhisk.Desc) =>
            a.name?.localeCompare(b.name as string) as number;

        if (element) {
            if (element instanceof WskEndpoint) {
                const namespaces = this.storageManager.getNamespaces(element.apihost);
                if (namespaces) {
                    return Promise.resolve(
                        namespaces.map(
                            (ns) =>
                                new WskNamespace(
                                    ns.name,
                                    openwhisk({ apihost: element.apihost, api_key: ns.api_key }),
                                    element
                                )
                        )
                    );
                }
            } else if (element instanceof WskNamespace) {
                const packages = element.client.packages
                    .list(listOptions)
                    .then((ps) =>
                        ps.sort(compareName).map((p) => createWskPackage(p, element.client))
                    );
                const triggers = element.client.triggers
                    .list(listOptions)
                    .then((ts) =>
                        ts.sort(compareName).map((t) => createWskTrigger(t, element.client))
                    );
                const actions = element.client.actions.list(listOptions).then((as) =>
                    as
                        .filter((a) => !a.namespace?.includes('/'))
                        .sort(compareName)
                        .map((a) => createWskAction(a, element.client))
                );
                return Promise.all<WskEntity[], WskEntity[], WskEntity[]>([
                    packages,
                    actions,
                    triggers,
                ]).then((arrs) => Promise.resolve<WskEntity[]>(arrs[0].concat(...arrs.slice(1))));
            } else if (element instanceof WskPackage) {
                if (element.packageDesc.name) {
                    const actionsInPackage = (
                        await element.client.packages.get(element.packageDesc.name)
                    ).actions;
                    if (actionsInPackage) {
                        return Promise.resolve(
                            actionsInPackage.map((a) =>
                                createWskAction(a, element.client, element.packageDesc)
                            )
                        );
                    }
                }
            }
        } else {
            try {
                await updateStatesByLocalWskPropFile(this.storageManager);
            } catch (e) {
                vscode.window.showErrorMessage(`Failed to load .wskprops (${e.message})`);
            }
            const endpoints = this.storageManager.getEndpoints();
            if (endpoints) {
                return Promise.resolve(
                    Object.entries(endpoints).map(
                        ([host, value]) => new WskEndpoint(value.alias, host)
                    )
                );
            }
        }
        return [];
    }
}

export async function updateStatesByLocalWskPropFile(manager: StorageManager): Promise<void> {
    const localAuthInfo = await getLocalAuthInfo();
    if (!localAuthInfo) {
        return Promise.resolve();
    }
    const [isValid, apihost] = await validateURL(localAuthInfo.apihost);

    let isExisted: any = manager.getEndpoints();
    if (isExisted !== undefined) {
        isExisted = isExisted[apihost];
        if (isExisted !== undefined) {
            isExisted = isExisted['namespaces'].find(
                (namespace: SavedNamespaceState) => namespace.api_key === localAuthInfo.api_key
            );
        }
    }

    if (isExisted === undefined) {
        const namespaceNames = await openwhisk({
            apihost: apihost,
            api_key: localAuthInfo.api_key,
        }).namespaces.list();
        try {
            if (isValid) {
                return manager.updateEndpoints(apihost, {
                    alias: localAuthInfo.apihost,
                    apihost: apihost,
                    namespaces: [
                        {
                            api_key: localAuthInfo.api_key,
                            name: namespaceNames[0],
                        },
                    ],
                });
            }
        } catch (e) {
            return Promise.reject(e);
        }
    }
    return Promise.resolve();
}

export async function addEndpoint(context: vscode.ExtensionContext) {
    const manager = new StorageManager(context.globalState);
    const endpoints = manager.getEndpoints();
    const baseOptions = { ignoreFocusOut: true };

    const rawApihost = await vscode.window.showInputBox({
        ...baseOptions,
        prompt: 'Openwhisk API Host',
        placeHolder: 'Enter Openwhisk API Host',
    });
    if (rawApihost === undefined) {
        throw Error('Empty apihost');
    }

    const [isValid, apihost] = await validateURL(rawApihost);
    if (!isValid) {
        vscode.window.showErrorMessage(
            'Failed to add new API host, please check the API host is valid'
        );
        return;
    }

    if (endpoints[apihost]) {
        vscode.window.showErrorMessage('This API host is already registered');
        return;
    }

    let alias = await vscode.window.showInputBox({
        ...baseOptions,
        prompt: 'Alias for the endpoint',
        placeHolder: 'Enter alias for the endpoint',
    });
    if (alias === undefined) {
        return;
    } else if (alias === '') {
        alias = apihost;
    }
    if (Object.values(endpoints).find((e) => e.alias === alias)) {
        vscode.window.showErrorMessage('Already existed alias');
        return;
    }

    return manager.updateEndpoints(apihost, {
        apihost,
        alias: alias as string,
        namespaces: [],
    });
}

export function removeEndpoint(endpoint: WskEndpoint, context: vscode.ExtensionContext) {
    const manager = new StorageManager(context.globalState);
    const endpoints = manager.getEndpoints();
    delete endpoints[endpoint.apihost];
    return context.globalState.update('endpoints', endpoints);
}

export async function addNamespace(
    apihost: string,
    context: vscode.ExtensionContext
): Promise<void> {
    const inputOptions = {
        prompt: `Authorization KEY for ${apihost}`,
        placeHolder: 'Enter authorization KEY',
        password: true,
        ignoreFocusOut: true,
    };
    const manager = new StorageManager(context.globalState);
    const api_key = await vscode.window.showInputBox(inputOptions);
    if (api_key === undefined) {
        // it's cancelled
        return;
    }

    if (manager.getEndpoints()[apihost].namespaces.find((ns) => ns.api_key === api_key)) {
        vscode.window.showErrorMessage('Already registered namespace');
        return;
    }

    const ns = await openwhisk({ apihost, api_key }).namespaces.list();
    return manager.addNamespace(apihost, { name: ns[0], api_key });
}

export async function renameEndpoint(apihost: string, context: vscode.ExtensionContext) {
    const manager = new StorageManager(context.globalState);
    const endpoints = manager.getEndpoints();

    const newAlias = await vscode.window.showInputBox({
        placeHolder: 'New Alias for the Endpoint',
    });
    if (newAlias === undefined) {
        return;
    }
    if (Object.values(endpoints).find((e) => e.alias === newAlias)) {
        vscode.window.showErrorMessage('Duplicated alias');
    }

    const endpoint = endpoints[apihost];
    endpoint.alias = newAlias;

    return manager.updateEndpoints(apihost, endpoint);
}

export async function removeNamespace(namespace: WskNamespace, context: vscode.ExtensionContext) {
    const manager = new StorageManager(context.globalState);

    // @ts-ignore
    const client: { apiKey: string } = namespace.client.namespaces.client.options;
    const apihost = namespace.wskEndpoint.apihost;
    const api_key = client.apiKey;

    const endpoints = manager.getEndpoints();
    const endpoint = endpoints[apihost];
    if (endpoint) {
        endpoint.namespaces = endpoint.namespaces.filter((n) => n.api_key !== api_key);
        await context.globalState.update('endpoints', endpoints);
    }
}

async function validateURL(url: string): Promise<[boolean, string]> {
    const baseOptions = {
        json: true,
        resolveWithFullResponse: true,
    };
    const falseReturn: [boolean, string] = [false, ''];
    let isValid = falseReturn;

    if (url.startsWith('https://') || url.startsWith('http://')) {
        try {
            isValid = await request.get({ ...baseOptions, url }).then((res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    return [true, url];
                }
                return falseReturn;
            });
        } catch (e) {
            isValid = falseReturn;
        }
    } else {
        try {
            isValid = await request.get({ url: 'https://' + url, ...baseOptions }).then((res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    return [true, 'https://' + url];
                }
                return falseReturn;
            });
        } catch (e) {
            try {
                isValid = await request
                    .get({ url: 'http://' + url, ...baseOptions })
                    .then((res) => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            return [true, 'http://' + url];
                        }
                        return falseReturn;
                    });
            } catch (e) {
                isValid = falseReturn;
            }
        }
    }
    return isValid;
}
