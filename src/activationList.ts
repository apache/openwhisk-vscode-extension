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
import * as moment from 'moment';
import { WskEntity, WskAction, WskActivation, WskNamespace } from './wskEntity';

export class WskActivationProvider implements vscode.TreeDataProvider<WskActivation> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        WskActivation | undefined
    > = new vscode.EventEmitter<WskActivation | undefined>();
    readonly onDidChangeTreeData: vscode.Event<WskActivation | undefined> = this
        ._onDidChangeTreeData.event;

    private selectedEntity: WskAction | WskNamespace | undefined;

    constructor(public context: vscode.ExtensionContext, entity: vscode.TreeView<WskEntity>) {
        entity.onDidChangeSelection((e) => {
            if (e.selection[0] instanceof WskAction) {
                this.selectedEntity = e.selection[0] as WskAction;
            } else if (e.selection[0] instanceof WskNamespace) {
                this.selectedEntity = e.selection[0] as WskNamespace;
            } else {
                this.selectedEntity = undefined;
            }
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: WskActivation) {
        return element;
    }

    async getChildren(element?: WskActivation): Promise<WskActivation[]> {
        if (this.selectedEntity instanceof WskNamespace) {
            const activations = await this.selectedEntity.client.activations.list();
            return this.generateChildren(activations, true);
        } else if (this.selectedEntity instanceof WskAction) {
            const activations = await this.selectedEntity.client.activations.list({
                name: this.selectedEntity.getFullName(),
            });
            return this.generateChildren(activations, false);
        }
        return [];
    }

    private generateChildren(
        activations: openwhisk.ActivationDesc[],
        withActionName: boolean
    ): WskActivation[] | PromiseLike<WskActivation[]> {
        return activations.map(
            (activation) =>
                new WskActivation(
                    this.makeActivationLabel(activation, withActionName),
                    vscode.TreeItemCollapsibleState.None,
                    (this.selectedEntity as WskAction).client,
                    activation
                )
        );
    }

    private makeActivationLabel(
        activation: openwhisk.ActivationDesc,
        withActionName: boolean
    ): string {
        // @ts-ignore
        const startTime = moment(activation.start).format('YYYY-MM-DD HH:mm:ss');
        // @ts-ignore
        const duration = activation.end - activation.start;
        const id = activation.activationId.slice(0, 6);
        // @ts-ignore
        const status = activation.statusCode === 0 ? 'success' : 'error';
        const start = activation.annotations?.find((x) => x.key === 'initTime') ? 'cold ' : 'warm';

        const durationFormat = `${duration} ms`;
        const actionName = `${activation.name}:${activation.version}`;

        if (withActionName) {
            return [startTime, id, status, start, durationFormat, actionName].join('\t');
        }
        return [startTime, id, status, start, durationFormat].join('\t');
    }
}

export function showActivationDetails(resourceUri: vscode.Uri): void {
    vscode.window.showTextDocument(resourceUri).then((editor) => {
        vscode.languages.setTextDocumentLanguage(editor.document, 'json');
    });
}
