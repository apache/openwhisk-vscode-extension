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
import * as assert from 'assert';
import * as vscode from 'vscode';
import { WskDeployManifestProvider } from '../../manifestList';

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

suite('ManifestList.WskDeployManifestProvider.getChildren', () => {
    test('Test filter', async () => {
        const context = { globalState: new MockState(initState), subscriptions: [] };
        const provider = new WskDeployManifestProvider(
            (context as unknown) as vscode.ExtensionContext
        );
        const manifest = (await provider.getChildren())[0];
        assert.strictEqual(manifest.label, 'valid-manifest.yaml');
    });
});
