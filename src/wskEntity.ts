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
import { encodeActionUri, encodeActivationUri } from './wskContent';
import { AuthInfo } from './authentication';
import { URL } from 'url';
import * as path from 'path';
import { RESOURCE_PATH } from './constant/path';

export class WskEntity extends vscode.TreeItem {
    contextValue = 'wskEntity';
}

export class WskEndpoint extends WskEntity {
    contextValue = 'wskEndpoint';

    constructor(public readonly label: string, public readonly apihost: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        super.iconPath = {
            light: path.resolve(RESOURCE_PATH, 'light/endpoint.svg'),
            dark: path.resolve(RESOURCE_PATH, 'dark/endpoint.svg'),
        };
    }
}

export class WskAction extends WskEntity {
    contextValue = 'wskAction';

    constructor(
        public readonly label: string,
        public readonly client: openwhisk.Client,
        public readonly actionDesc: openwhisk.ActionDesc,
        public readonly packageDesc?: openwhisk.PackageDesc,
        public readonly description?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.resourceUri = encodeActionUri(
            this.getFullName() + this.getKindExtension(),
            getAuthByClient(this.client)
        );
        this.command = {
            title: 'Open action code',
            command: 'wskAction.openActionCode',
            arguments: [this],
        };
    }

    get kind(): string {
        return this.actionDesc.annotations?.find((kv) => kv.key === 'exec')?.value;
    }

    get fileExtension(): string {
        return this.getKindExtension();
    }

    async getRemoteAction(): Promise<openwhisk.Action> {
        return await this.client.actions.get({
            name: this.getFullName(),
        });
    }

    getFullName(): string {
        const actionName = this.actionDesc.name || 'unknown';
        if (this.packageDesc) {
            return this.packageDesc.name + '/' + actionName;
        }
        return actionName;
    }

    private getKindExtension(): string {
        const runtime = this.kind.split(':')[0];
        switch (runtime) {
            case 'java':
                return '.java';
            case 'nodejs':
                return '.js';
            case 'python':
                return '.py';
            case 'swift':
                return '.swift';
            case 'php':
                return '.php';
            case 'go':
                return '.go';
            case 'ruby':
                return '.rb';
            default:
                return '';
        }
    }

    static removeExtension(name: string): string {
        if (
            name.endsWith('.java') ||
            name.endsWith('.js') ||
            name.endsWith('.py') ||
            name.endsWith('.swift') ||
            name.endsWith('.php') ||
            name.endsWith('.go') ||
            name.endsWith('.rb')
        ) {
            const fullname = path.parse(name);
            if (fullname.dir) {
                return fullname.dir + '/' + fullname.name;
            }
            return fullname.name;
        }
        return name;
    }
}

export class WskNamespace extends WskEntity {
    contextValue = 'wskNamespace';

    constructor(
        public readonly label: string,
        public readonly client: openwhisk.Client,
        public readonly wskEndpoint: WskEndpoint
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = {
            light: path.resolve(RESOURCE_PATH, 'light/namespace.svg'),
            dark: path.resolve(RESOURCE_PATH, 'dark/namespace.svg'),
        };
    }
}

export class WskActivation extends WskEntity {
    constructor(
        public readonly label: string, // do not use label to get activation name
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly client: openwhisk.Client,
        public readonly activationDesc: openwhisk.ActivationDesc
    ) {
        super(label, collapsibleState);
        const resourceUri = encodeActivationUri(
            activationDesc.activationId,
            getAuthByClient(this.client)
        );
        this.command = {
            title: 'Show activation',
            command: 'wskActivation.showDetails',
            arguments: [resourceUri],
        };
    }
}

export class WskTrigger extends WskEntity {
    contextValue = 'wskTrigger';

    command = {
        title: 'Show Trigger Information',
        command: 'wskTrigger.showInfo',
        arguments: [this],
    };

    constructor(
        public readonly label: string, // do not use label to get trigger name
        public readonly client: openwhisk.Client,
        public readonly triggerDesc: openwhisk.TriggerDesc
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        super.iconPath = {
            light: path.resolve(RESOURCE_PATH, 'light/trigger.svg'),
            dark: path.resolve(RESOURCE_PATH, 'dark/trigger.svg'),
        };
    }
}

export class WskPackage extends WskEntity {
    contextValue = 'wskPackage';

    constructor(
        public readonly label: string, // do not use label to get package name
        public readonly client: openwhisk.Client,
        public readonly packageDesc: openwhisk.PackageDesc,
        public readonly description?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = {
            light: path.resolve(RESOURCE_PATH, 'light/package.svg'),
            dark: path.resolve(RESOURCE_PATH, 'dark/package.svg'),
        };
    }

    async getRemotePackage(): Promise<openwhisk.Package> {
        return await this.client.packages.get({
            name: this.packageDesc.name as string,
        });
    }

    async updateRemotePackage(pkg: openwhisk.Package): Promise<openwhisk.Package> {
        return await this.client.packages.update({
            name: this.packageDesc.name as string,
            package: pkg,
        });
    }
}

export function createWskAction(
    actionDesc: openwhisk.ActionDesc,
    client: openwhisk.Client,
    packageDesc?: openwhisk.PackageDesc
): WskAction {
    const label = actionDesc.name || 'unknown';
    let description;

    const webExport = actionDesc.annotations?.find((kv) => kv.key === 'web-export')?.value;
    if (webExport === true) {
        description = 'web';
    }
    return new WskAction(label, client, actionDesc, packageDesc, description);
}

export function createWskTrigger(
    triggerDesc: openwhisk.TriggerDesc,
    client: openwhisk.Client
): WskTrigger {
    const label = triggerDesc.name || 'unknown';
    return new WskTrigger(label, client, triggerDesc);
}

export function createWskPackage(
    packageDesc: openwhisk.PackageDesc,
    client: openwhisk.Client
): WskPackage {
    const label = packageDesc.name || 'unknown';
    if (packageDesc.binding) {
        // @ts-ignore
        const description = `(${packageDesc.binding.namespace}/${packageDesc.binding.name})`;
        return new WskPackage(label, client, packageDesc, description);
    }
    return new WskPackage(label, client, packageDesc);
}

export function getAuthByClient(client: openwhisk.Client): AuthInfo {
    return {
        // @ts-ignore
        apihost: new URL(client.actions.client.options.api).origin,
        // @ts-ignore
        api_key: client.actions.client.options.apiKey,
    };
}
