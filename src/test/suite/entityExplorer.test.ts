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
import * as assert from 'assert';
import * as vscode from 'vscode';
import { removeEndpoint, removeNamespace, WskEntityProvider } from '../../entityExplorer';
import { WskEndpoint, WskNamespace } from '../../wskEntity';
import * as openwhisk from 'openwhisk';

class MockState {
    public _content: { [key: string]: any } = {};
    constructor(state?: any) {
        if (state) {
            this._content = state;
        }
    }
    get(key: string): any {
        return this._content[key];
    }
    update(key: string, value: any) {
        return (this._content[key] = value);
    }
}

suite('entityExplorer.WskEntityExprovider.getChildren', () => {
    test('Make WskEndpoints', async () => {
        const context = {
            globalState: new MockState({
                endpoints: {
                    'https://test.openwhisk.com': {
                        alias: 'test',
                        apihost: 'https://test.openwhisk.com',
                        namespaces: [],
                    },
                },
            }),
        };
        const explorer = new WskEntityProvider((context as unknown) as vscode.ExtensionContext);
        const child = (await explorer.getChildren())[0];
        assert(child instanceof WskEndpoint);
        assert.strictEqual(child.label, 'test');
        assert.strictEqual((child as WskEndpoint).apihost, 'https://test.openwhisk.com');
    });

    test('Make WskNamespaces', async () => {
        const context = {
            globalState: new MockState({
                endpoints: {
                    'https://test.openwhisk.com': {
                        alias: 'test',
                        apihost: 'https://test.openwhisk.com',
                        namespaces: [
                            {
                                name: 'namespace0',
                                api_key: '1234:asdf',
                            },
                            {
                                name: 'namespace1',
                                api_key: '2345:wert',
                            },
                        ],
                    },
                },
            }),
        };
        const explorer = new WskEntityProvider((context as unknown) as vscode.ExtensionContext);
        const endpoint = new WskEndpoint('test', 'https://test.openwhisk.com');
        const children = await explorer.getChildren(endpoint);
        assert(children[0] instanceof WskNamespace);
        assert.deepStrictEqual(
            children[0],
            new WskNamespace(
                'namespace0',
                openwhisk({
                    apihost: 'https://test.openwhisk.com',
                    api_key: '1234:asdf',
                }),
                endpoint
            )
        );
        assert.deepStrictEqual(
            children[1],
            new WskNamespace(
                'namespace1',
                openwhisk({
                    apihost: 'https://test.openwhisk.com',
                    api_key: '2345:wert',
                }),
                endpoint
            )
        );
    });
});

suite('entityExplorer.removeEndpoint', () => {
    test('Remove registered endpoint', async () => {
        const context = {
            globalState: new MockState({
                endpoints: {
                    'https://test.openwhisk.com': {
                        alias: 'test',
                        apihost: 'https://test.openwhisk.com',
                        namespaces: [],
                    },
                },
            }),
        };
        const e = new WskEndpoint('test', 'https://test.openwhisk.com');

        await removeEndpoint(e, (context as unknown) as vscode.ExtensionContext);

        assert.deepStrictEqual(context.globalState.get('endpoints'), {});
    });
});

suite('entityExplorer.removeNamespace', () => {
    test('Remove registered endpoint', async () => {
        const context = {
            globalState: new MockState({
                endpoints: {
                    'https://test.openwhisk.com': {
                        alias: 'test',
                        apihost: 'https://test.openwhisk.com',
                        namespaces: [
                            {
                                name: 'namespace0',
                                api_key: '1234:asdf',
                            },
                            {
                                name: 'namespace1',
                                api_key: '2345:wert',
                            },
                        ],
                    },
                },
            }),
        };
        const openwhiskClient = openwhisk({
            apihost: 'https://test.openwhisk.com',
            api_key: '1234:asdf',
        });
        const e = new WskEndpoint('mcokLabel', 'https://test.openwhisk.com');
        const n = new WskNamespace('test', openwhiskClient, e);
        await removeNamespace(n, (context as unknown) as vscode.ExtensionContext);

        assert.deepStrictEqual(
            context.globalState.get('endpoints')['https://test.openwhisk.com'].namespaces,
            [
                {
                    name: 'namespace1',
                    api_key: '2345:wert',
                },
            ]
        );
    });
});
