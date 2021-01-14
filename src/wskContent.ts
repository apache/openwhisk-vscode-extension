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
import * as querystring from 'querystring';
import * as vscode from 'vscode';
import * as openwhisk from 'openwhisk';
import { AuthInfo } from './authentication';
import { WskAction } from './wskEntity';

export class ActivationProvider implements vscode.TextDocumentContentProvider {
    static scheme = 'wskActivation';

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const auth = getAuthFromUri(uri);
        const ow = openwhisk({ api_key: auth.api_key, apihost: auth.apihost });

        const content = await ow.activations.get(uri.path);
        return Promise.resolve(JSON.stringify(content, null, 4));
    }
}

export class ActionCodeProvider implements vscode.TextDocumentContentProvider {
    static scheme = 'wskActionCode';

    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const auth = getAuthFromUri(uri);
        const ow = openwhisk({ api_key: auth.api_key, apihost: auth.apihost });

        const content = await ow.actions.get(WskAction.removeExtension(uri.path));
        if (content.exec.kind === 'sequence') {
            return 'Codeview does not support sequence actions.';
        }
        if ((content.exec.kind as string) === 'blackbox' && !content.exec.code) {
            return 'Codeview does not support native docker actions.';
        }
        return Promise.resolve(content.exec.code);
    }
}

export function encodeActionUri(name: string, auth: AuthInfo): vscode.Uri {
    const query = querystring.stringify(auth as any);
    return vscode.Uri.parse(`${ActionCodeProvider.scheme}:${name}?${query}`);
}

export function encodeActivationUri(name: string, auth: AuthInfo): vscode.Uri {
    const query = querystring.stringify(auth as any);
    return vscode.Uri.parse(`${ActivationProvider.scheme}:${name}?${query}`);
}

export function getAuthFromUri(uri: vscode.Uri): AuthInfo {
    const queries = querystring.parse(uri.query);
    return {
        api_key: queries.api_key as string,
        apihost: queries.apihost as string,
    };
}
