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
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as commandExists from 'command-exists';

import { StorageManager } from './storage';
import { updateStatesByLocalWskPropFile } from './entityExplorer';
import { RESOURCE_PATH } from './constant/path';

enum WskDeployCommands {
    DEPLOY,
    UNDEPLOY,
    SYNC,
}

interface AuthMetadata {
    apihost: string;
    api_key: string;
    namespace: string;
    endpoint: string;
}

interface CommandExecResult {
    stdout: string;
    stderr: string;
}

class AuthPick {
    public label = '';
    public detail = '';

    constructor(public readonly auth: AuthMetadata | null) {
        if (auth) {
            this.label = `${auth.endpoint}/${auth.namespace}`;
            this.detail = `API Host: ${auth.apihost}`;
        }
    }
}

class DefaultAuthPick extends AuthPick {
    label = 'Default';
    detail = 'Use .wskprops in the home directory';
    constructor() {
        super(null);
    }
}

class CommandError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'CommandError';
    }
}

class CommandNotFoundError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'CommandNotFoundError';
    }
}

class WskDeployEntity extends vscode.TreeItem {}

class WskDeployCommand extends WskDeployEntity {
    constructor(
        public readonly wskDeployCommand: WskDeployCommands,
        public readonly label: string,
        public readonly manifest: WskDeployManifest
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = this.getIconPath(wskDeployCommand);
        this.manifest = manifest;
        this.contextValue = 'manifestCommand';
    }

    private getIconPath(wskDeployCommand: WskDeployCommands): { light: string; dark: string } {
        if (wskDeployCommand === WskDeployCommands.UNDEPLOY) {
            return {
                light: path.join(RESOURCE_PATH, 'light', 'undeploy.svg'),
                dark: path.join(RESOURCE_PATH, 'dark', 'undeploy.svg'),
            };
        }
        if (wskDeployCommand === WskDeployCommands.SYNC) {
            return {
                light: path.join(RESOURCE_PATH, 'light', 'sync.svg'),
                dark: path.join(RESOURCE_PATH, 'dark', 'sync.svg'),
            };
        }
        return {
            light: path.join(RESOURCE_PATH, 'light', 'deploy.svg'),
            dark: path.join(RESOURCE_PATH, 'dark', 'deploy.svg'),
        };
    }
}

class WskDeployManifest extends WskDeployEntity {
    constructor(public readonly uri: vscode.Uri, auth?: AuthMetadata) {
        super(
            path.relative(
                (vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[])[0].uri.path,
                uri.path
            ),
            vscode.TreeItemCollapsibleState.Expanded
        );
        if (auth) {
            this.auth = auth;
        }
        super.iconPath = {
            light: path.join(RESOURCE_PATH, 'light', 'manifest.svg'),
            dark: path.join(RESOURCE_PATH, 'dark', 'manifest.svg'),
        };
    }

    auth: AuthMetadata | null = null;
    contextValue = 'manifest';
}

async function showConfirmationModal(message: string, auth: AuthMetadata | null): Promise<void> {
    let msg = message;
    if (auth) {
        msg += `\n\nnamespace: ${auth.namespace}\nAPI host: ${auth.apihost}`;
    }
    const yes = await vscode.window.showInformationMessage(msg, { modal: true }, 'Yes');
    if (yes === 'Yes') {
        return Promise.resolve();
    } else {
        return Promise.reject();
    }
}

export class WskDeployManifestProvider implements vscode.TreeDataProvider<WskDeployEntity> {
    private _filteredFiles: string[] = [];
    private _manifests: WskDeployManifest[] = [];
    private storageManager: StorageManager;

    private _onDidChangeTreeData: vscode.EventEmitter<
        WskDeployManifest | undefined
    > = new vscode.EventEmitter<WskDeployManifest | undefined>();
    readonly onDidChangeTreeData: vscode.Event<WskDeployManifest | undefined> = this
        ._onDidChangeTreeData.event;

    constructor(public context: vscode.ExtensionContext) {
        this.storageManager = new StorageManager(context.globalState);

        context.subscriptions.push(
            vscode.commands.registerCommand('wskdeploy.openManifest', (uri) =>
                this.openManifest(uri)
            ),
            vscode.commands.registerCommand('wskdeploy.refresh', () => this.refresh()),
            vscode.commands.registerCommand('wskdeploy.runCommand', async (command) =>
                this.runCommand(context, command, false)
            ),
            vscode.commands.registerCommand('wskdeploy.runCommandWithDeployment', async (command) =>
                this.runCommand(context, command, true)
            )
        );

        if (vscode.workspace.workspaceFolders) {
            const YAMLwatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], '**/*.{yml,yaml}')
            );
            YAMLwatcher.onDidCreate((_) => this.refresh());
            YAMLwatcher.onDidDelete((_) => this.refresh());
            YAMLwatcher.onDidChange((_) => this.refresh());
        }
    }

    private async runCommand(
        context: vscode.ExtensionContext,
        command: WskDeployCommand,
        withDeployment: boolean
    ): Promise<void> {
        const authList = [
            new DefaultAuthPick(),
            ...this.getSavedAuthList().map((auth) => new AuthPick(auth)),
        ];
        let deploymentFile;

        // select deployment yaml
        if (withDeployment) {
            const OPEN_FILE = 'Open file...';
            const selected = await vscode.window.showQuickPick(
                [...this._manifests.map((m) => m.uri.path), OPEN_FILE],
                {
                    placeHolder: 'Select the wskdeploy deployment yaml file',
                }
            );
            if (!selected) {
                return;
            }
            if (selected === OPEN_FILE) {
                const uri = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {
                        Manifest: ['yaml', 'yml'],
                    },
                });
                if (!uri || uri.length === 0) {
                    return;
                }
                deploymentFile = uri[0].path;
            } else {
                deploymentFile = selected;
            }
        }

        // select target namespace and host
        const selected = await vscode.window.showQuickPick<AuthPick>(authList, {
            placeHolder: `Select the target API host to run ${command.label} command`,
        });
        if (!selected) {
            return;
        }
        const projectName = await vscode.window.showInputBox({
            placeHolder: 'Please enter project name (optional)',
        });

        // run command
        switch (command.wskDeployCommand) {
            case WskDeployCommands.DEPLOY:
                this.runDeploy(command.manifest, selected.auth, deploymentFile, projectName);
                break;

            case WskDeployCommands.UNDEPLOY:
                this.runUndeploy(command.manifest, selected.auth, deploymentFile, projectName);
                break;

            case WskDeployCommands.SYNC:
                this.runSync(command.manifest, selected.auth, deploymentFile, projectName);
                break;
        }
    }

    private async handleCommandNotFoundError(retryCallback: () => void): Promise<void> {
        const BROWSE_FOR_FILE = 'Browse for file';
        const DOWNLOAD_WSKDEPLOY = 'Download wskdeploy';

        const answer = await vscode.window.showInformationMessage(
            `The wskdeploy was not found. Would you like to find the binary file yourself?`,
            { modal: true },
            BROWSE_FOR_FILE,
            DOWNLOAD_WSKDEPLOY
        );
        if (answer === BROWSE_FOR_FILE) {
            const uri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectMany: false,
            });
            if (uri) {
                this.storageManager.setWskdeployPath(uri[0]);
                retryCallback();
            }
        } else if (answer === DOWNLOAD_WSKDEPLOY) {
            vscode.env.openExternal(
                vscode.Uri.parse('https://github.com/apache/openwhisk-wskdeploy/releases')
            );
        }
    }

    private _runCommand(command: { (): Promise<CommandExecResult> }): void {
        command()
            .then((ret) => vscode.window.showInformationMessage(ret.stdout))
            .catch(async (error) => {
                if (error instanceof CommandNotFoundError) {
                    await this.handleCommandNotFoundError(() => {
                        this._runCommand(command);
                    });
                } else {
                    vscode.window.showErrorMessage(error.message);
                }
            });
    }

    private async runDeploy(
        manifest: WskDeployManifest,
        auth: AuthMetadata | null,
        deployment?: string,
        projectName?: string
    ): Promise<void> {
        await showConfirmationModal(
            `Are you sure you want to deploy?\n(${manifest.label})`,
            auth
        ).then(() => {
            this._runCommand(() => this.deploy(manifest, auth, deployment, projectName));
        });
    }

    private async runUndeploy(
        manifest: WskDeployManifest,
        auth: AuthMetadata | null,
        deployment?: string,
        projectName?: string
    ): Promise<void> {
        await showConfirmationModal(
            `Are you sure you want to undeploy?\n(${manifest.label})`,
            auth
        ).then(() => {
            this._runCommand(() => this.undeploy(manifest, auth, deployment, projectName));
        });
    }

    private async runSync(
        manifest: WskDeployManifest,
        auth: AuthMetadata | null,
        deployment?: string,
        projectName?: string
    ): Promise<void> {
        await showConfirmationModal(
            `Are you sure you want to sync?\n(${manifest.label})`,
            auth
        ).then(() => {
            this._runCommand(() => this.sync(manifest, auth, deployment, projectName));
        });
    }

    refresh(): void {
        this._manifests = [];
        this._onDidChangeTreeData.fire(undefined);
    }

    async getChildren(element?: WskDeployEntity): Promise<WskDeployEntity[]> {
        updateStatesByLocalWskPropFile(this.storageManager);

        if (element instanceof WskDeployManifest) {
            return [
                new WskDeployCommand(WskDeployCommands.DEPLOY, 'deploy', element),
                new WskDeployCommand(WskDeployCommands.UNDEPLOY, 'undeploy', element),
                new WskDeployCommand(WskDeployCommands.SYNC, 'sync', element),
            ];
        }

        let manifests: vscode.Uri[] = [];
        try {
            if (vscode.workspace.workspaceFolders) {
                manifests = await vscode.workspace.findFiles(
                    '**/*.{yml,yaml}',
                    '**/node_modules/**'
                );
            }
        } catch (e) {
            return [];
        }
        this._manifests = manifests
            .filter((file) => this.validateManifest(file.fsPath))
            .filter((f) => !this._filteredFiles.includes(f.fsPath))
            .sort()
            .map((uri) => new WskDeployManifest(uri));

        return this._manifests;
    }

    getTreeItem(element: WskDeployEntity): WskDeployEntity {
        return element;
    }

    private getSavedAuthList(): AuthMetadata[] {
        const endpoints = this.storageManager.getEndpoints();
        // @ts-ignore
        return Object.entries(endpoints).flatMap(([endpoint, data]) =>
            data.namespaces.map((namespace: { api_key: string; name: string }) =>
                Object({
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    api_key: namespace.api_key,
                    namespace: namespace.name,
                    apihost: endpoint,
                    endpoint: data.alias,
                })
            )
        );
    }

    private openManifest(manifest: vscode.Uri): void {
        vscode.window.showTextDocument(manifest);
    }

    private validateManifest(path: string): boolean {
        function isEmpty(obj: Record<string, any>): boolean {
            return Object.entries(obj).length === 0;
        }

        try {
            const doc = fs.readFileSync(path, { encoding: 'utf8' });
            const contents = yaml.safeLoad(doc, { json: true });

            if (contents === undefined) {
                return false;
            }
            if (
                'project' in contents &&
                'packages' in contents.project &&
                !isEmpty(contents.project.packages)
            ) {
                return true;
            }
            if ('packages' in contents && !isEmpty(contents.packages)) {
                return true;
            }
        } catch {
            // ignore exception
        }
        return false;
    }

    private deploy(
        manifest: WskDeployManifest,
        auth: AuthMetadata | null,
        deploymentFile?: string,
        projectName?: string
    ): Promise<CommandExecResult> {
        const command = '';
        return this.execCommand(command, manifest, auth, deploymentFile, projectName);
    }

    private undeploy(
        manifest: WskDeployManifest,
        auth: AuthMetadata | null,
        deploymentFile?: string,
        projectName?: string
    ): Promise<CommandExecResult> {
        const command = 'undeploy';
        return this.execCommand(command, manifest, auth, deploymentFile, projectName);
    }

    private sync(
        manifest: WskDeployManifest,
        auth: AuthMetadata | null,
        deploymentFile?: string,
        projectName?: string
    ): Promise<CommandExecResult> {
        const command = 'sync';
        return this.execCommand(command, manifest, auth, deploymentFile, projectName);
    }

    private execCommand(
        command: string,
        manifest: WskDeployManifest,
        auth: AuthMetadata | null,
        deploymentFile: string | undefined,
        projectName?: string
    ): Promise<CommandExecResult> {
        return new Promise<CommandExecResult>((resolve, reject) => {
            const wskdeployPath = this.getWskdeployPath();
            const cwd = path.dirname(manifest.uri.fsPath);
            commandExists(wskdeployPath)
                .then(() => {
                    cp.exec(
                        this.getCommandWithAuth(
                            wskdeployPath,
                            command,
                            manifest,
                            auth,
                            deploymentFile,
                            projectName
                        ),
                        {
                            cwd,
                        },
                        (error, stdout, stderr) => {
                            if (!error) {
                                resolve({ stdout, stderr });
                                return;
                            }
                            reject(new CommandError(stderr));
                        }
                    );
                })
                .catch(function () {
                    // command doesn't exist
                    reject(new CommandNotFoundError());
                });
        });
    }

    private getWskdeployPath(): string {
        let wskdeploy = 'wskdeploy';
        const wskdeployPath = this.storageManager.getWskdeployPath();
        if (wskdeployPath) {
            wskdeploy = vscode.Uri.file(wskdeployPath.path).fsPath;
        }
        return wskdeploy;
    }

    private getCommandWithAuth(
        wskdeployPath: string,
        command: string,
        manifest: WskDeployManifest,
        auth: AuthMetadata | null,
        deploymentFile?: string,
        projectName?: string
    ): string {
        let commandline = `${wskdeployPath} ${command} -m ${manifest.uri.fsPath}`;
        if (auth) {
            commandline += ` --apihost ${auth.apihost} -u ${auth.api_key}`;
        }
        if (deploymentFile) {
            commandline += ` -d ${deploymentFile}`;
        }
        if (projectName) {
            commandline += ` --projectname ${projectName}`;
        }
        return commandline;
    }
}
