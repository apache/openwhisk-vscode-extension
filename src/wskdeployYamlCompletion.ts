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

enum Scope {
    None = -1,
    PACKAGES = 0,
    ACTIONS = 1,
    RULES = 2,
    TRIGGERS = 3,
    DEPENDENCIES = 4,
}
interface ScopeResult {
    scope: Scope;
}

const ACTION_ENTITY =
    '${1:<enter action name>}:\n\tversion: 1.0\n\tfunction: ${2:src/action.js}\n\truntime: ${3:nodejs:10}';
const PACKAGE_ENTITY =
    '${1:<enter package name>}:\n\tversion: ${2:1.0}\n\tlicense: ${3:Apache-2.0}\n';
const TRIGGER_ENTITY =
    '${1:<enter trigger name>}:\n\tfeed: ${2:<feed name>}\n\tinputs:\n\t\t${3:<list of parameter>}';
const RULE_ENTITY =
    '${1:<enter rule name>}:\n\tdescription: ${2:<rule description>}\n\ttrigger: ${3:<trigger name>}\n\taction: ${4:<action path>}';

function addTab(entity: string): string {
    return '\t' + entity.replace(/\n\t/g, '\n\t\t');
}

const snippetDefaultCompletions = [
    {
        label: 'wskdeploy:packages',
        text: 'packages:\n' + addTab(PACKAGE_ENTITY),
        detail: 'wskdeploy packages entity',
        documentation:
            'The Package entity schema is used to define an OpenWhisk package within a manifest.',
    },
];

const snippetActionScopeCompletions = [
    {
        label: 'wskdeploy:action',
        text: ACTION_ENTITY,
        detail: 'wskdeploy action entity',
        documentation:
            'The Action entity schema contains the necessary information to deploy an OpenWhisk function and define its deployment configurations, inputs and outputs.',
    },
];

const snippetTriggerScopeCompletions = [
    {
        label: 'wskdeploy:trigger',
        text: TRIGGER_ENTITY,
        detail: 'wskdeploy trigger entity',
        documentation:
            'The Trigger entity schema contains the necessary information to describe the stream of events that it represents.',
    },
];

const snippetRuleScopeCompletions = [
    {
        label: 'wskdeploy:rule',
        text: RULE_ENTITY,
        detail: 'wskdeploy rule entity',
        documentation:
            'The Rule entity schema contains the information necessary to associates one trigger with one action, with every firing of the trigger causing the corresponding action to be invoked with the trigger event as input.',
    },
];

const snippetPackageScopeCompletions = [
    {
        label: 'wskdeploy:package',
        text: PACKAGE_ENTITY,
        detail: 'wskdeploy package entity',
        documentation:
            'The Package entity schema is used to define an OpenWhisk package within a manifest.',
    },
    {
        label: 'wskdeploy:actions',
        text: 'actions:\n' + addTab(ACTION_ENTITY),
        detail: 'wskdeploy actions entity',
        documentation:
            'The Action entity schema contains the necessary information to deploy an OpenWhisk function and define its deployment configurations, inputs and outputs.',
    },
    {
        label: 'wskdeploy:triggers',
        text: 'triggers:\n' + addTab(TRIGGER_ENTITY),
        detail: 'wskdeploy triggers entity',
        documentation:
            'The Trigger entity schema contains the necessary information to describe the stream of events that it represents.',
    },
    {
        label: 'wskdeploy:rules',
        text: 'rules:\n' + addTab(RULE_ENTITY),
        detail: 'wskdeploy rules entity',
        documentation:
            'The Rule entity schema contains the information necessary to associates one trigger with one action, with every firing of the trigger causing the corresponding action to be invoked with the trigger event as input.',
    },
];

export class WskdeployYamlCompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const result = this.checkScope(document, position);
        if (result.scope === Scope.ACTIONS) {
            return this.getCompletions(snippetActionScopeCompletions);
        }
        if (result.scope === Scope.PACKAGES) {
            return this.getCompletions(snippetPackageScopeCompletions);
        }
        if (result.scope === Scope.RULES) {
            return this.getCompletions(snippetRuleScopeCompletions);
        }
        if (result.scope === Scope.TRIGGERS) {
            return this.getCompletions(snippetTriggerScopeCompletions);
        }
        return this.getCompletions(snippetDefaultCompletions);
    }

    private checkScope(document: vscode.TextDocument, position: vscode.Position): ScopeResult {
        const firstNonWhitespaceCharacterIndex = document.lineAt(position.line)
            .firstNonWhitespaceCharacterIndex;

        for (let i = position.line; i--; i >= 0) {
            const lineAt = document.lineAt(i);
            if (lineAt.firstNonWhitespaceCharacterIndex >= firstNonWhitespaceCharacterIndex) {
                continue;
            }
            const actionScopeIndex = lineAt.text.indexOf('actions:');
            if (actionScopeIndex >= 0) {
                return {
                    scope: Scope.ACTIONS,
                };
            }
            const triggerScopeIndex = lineAt.text.indexOf('triggers:');
            if (triggerScopeIndex >= 0) {
                return {
                    scope: Scope.TRIGGERS,
                };
            }
            const ruleScopeIndex = lineAt.text.indexOf('rules:');
            if (ruleScopeIndex >= 0) {
                return {
                    scope: Scope.RULES,
                };
            }
            const packageScopeIndex = lineAt.text.indexOf('packages:');
            if (packageScopeIndex >= 0) {
                return {
                    scope: Scope.PACKAGES,
                };
            }
            const dependencyScopeIndex = lineAt.text.indexOf('dependencies:');
            if (dependencyScopeIndex >= 0) {
                return {
                    scope: Scope.DEPENDENCIES,
                };
            }
        }
        return {
            scope: Scope.None,
        };
    }

    private getCompletions(completions: any) {
        return completions.map(
            (c: {
                label: string;
                text: string | undefined;
                documentation: string | undefined;
                detail: string | undefined;
            }) => {
                const completion = new vscode.CompletionItem(c.label);
                completion.insertText = new vscode.SnippetString(c.text);
                completion.documentation = new vscode.MarkdownString(c.documentation);
                completion.detail = c.detail;
                return completion;
            }
        );
    }
}
