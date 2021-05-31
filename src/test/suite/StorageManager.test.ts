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
import * as assert from 'assert';
import * as vscode from 'vscode';
import { StorageManager } from '../../storage';

class MockState implements vscode.Memento {
    public _content: { [key: string]: any } = {};
    constructor(initial?: { [key: string]: any }) {
        if (initial) {
            this._content = initial;
        }
    }
    get(key: string): any {
        return this._content[key];
    }
    update(key: string, value: any) {
        return (this._content[key] = value);
    }
}

const initState = {
    endpoints: {
        'example.com': {
            alias: 'test',
            apihost: 'example.com',
            namespaces: [
                {
                    name: 'testNamespace0',
                    api_key: '1234:asdf',
                },
                {
                    name: 'testNamespace1',
                    api_key: '5678:qwer',
                },
            ],
        },
    },
};

function getMockedState() {
    return JSON.parse(JSON.stringify(initState));
}

suite('StorageManager.getEndpoints', () => {
    test('Retrieve exact value in state', () => {
        const manager = new StorageManager(new MockState(getMockedState()));
        assert.deepStrictEqual(manager.getEndpoints(), {
            'example.com': {
                alias: 'test',
                apihost: 'example.com',
                namespaces: [
                    {
                        name: 'testNamespace0',
                        api_key: '1234:asdf',
                    },
                    {
                        name: 'testNamespace1',
                        api_key: '5678:qwer',
                    },
                ],
            },
        });
    });
    test('Get empty object if initialization is not done', () => {
        const manager = new StorageManager(new MockState({}));
        assert.deepStrictEqual(manager.getEndpoints(), {});
    });
});

suite('StorageManager.getNamespaces', () => {
    test('Get all namespaces in a specific endpoint', () => {
        const manager = new StorageManager(new MockState(getMockedState()));
        assert.deepStrictEqual(manager.getNamespaces('example.com'), [
            {
                name: 'testNamespace0',
                api_key: '1234:asdf',
            },
            {
                name: 'testNamespace1',
                api_key: '5678:qwer',
            },
        ]);
    });

    test('Get undefined if the endpoint does not exist', () => {
        const manager = new StorageManager(new MockState(getMockedState()));
        assert.deepStrictEqual(manager.getNamespaces('example2.com'), undefined);
    });
});

suite('StorageManager.getNamespace', () => {
    test("Get namespace by endpoint and namespace's name", () => {
        const manager = new StorageManager(new MockState(getMockedState()));
        assert.deepStrictEqual(manager.getNamespace('example.com', 'testNamespace0'), {
            name: 'testNamespace0',
            api_key: '1234:asdf',
        });
        assert.deepStrictEqual(manager.getNamespace('example.com', 'testNamespace1'), {
            name: 'testNamespace1',
            api_key: '5678:qwer',
        });
    });

    test('Get undefined if the endpoint or the namespace does not exist', () => {
        const manager = new StorageManager(new MockState(getMockedState()));
        assert.deepStrictEqual(
            manager.getNamespace('example1.com', 'testNamespace1'),
            undefined,
            'Wrong endpoint'
        );
        assert.deepStrictEqual(
            manager.getNamespace('example.com', 'testNamespace2'),
            undefined,
            'Wrong namespace'
        );
    });
});

suite('StorageManager.updateEndpoints', () => {
    test('Add a new endpoint', async () => {
        const manager = new StorageManager(new MockState(getMockedState()));
        const endpoint = {
            alias: 'newly added',
            apihost: 'example2.com',
            namespaces: [],
        };
        await manager.updateEndpoints('example2.com', endpoint);
        assert.deepStrictEqual(manager.getEndpoints(), {
            ...initState.endpoints,
            'example2.com': endpoint,
        });
    });
});

suite('StorageManager.addNamespace', () => {
    const namespace = {
        name: 'addedNamespace',
        api_key: '3456:zxcv',
    };

    test('Add a new namespace', async () => {
        const manager = new StorageManager(new MockState(getMockedState()));
        await manager.addNamespace('example.com', namespace);
        assert.deepStrictEqual(manager.getNamespaces('example.com'), [
            {
                name: 'testNamespace0',
                api_key: '1234:asdf',
            },
            {
                name: 'testNamespace1',
                api_key: '5678:qwer',
            },
            {
                name: 'addedNamespace',
                api_key: '3456:zxcv',
            },
        ]);
    });

    test('Throw error if endpoint does not exist', async () => {
        const manager = new StorageManager(new MockState(getMockedState()));
        await assert.rejects(
            async () =>
                await manager.addNamespace('example2.com', {
                    name: 'addedNamespace',
                    api_key: '3456:zxcv',
                }),
            Error
        );
    });
});
