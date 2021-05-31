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
import { WskAction, getAuthByClient } from '../../wskEntity';
import * as openwhisk from 'openwhisk';

suite('wskEntity.WskAction.removeExtension', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Remove only extension', () => {
        assert.strictEqual(WskAction.removeExtension('action.js'), 'action');
        assert.strictEqual(WskAction.removeExtension('package/action.py'), 'package/action');
        assert.strictEqual(
            WskAction.removeExtension('package/deep/dir/action.java'),
            'package/deep/dir/action'
        );
    });

    test('Do nothing with argument without known extension', () => {
        assert.strictEqual(WskAction.removeExtension('test.html'), 'test.html');
        assert.strictEqual(WskAction.removeExtension('testdir/test.cc'), 'testdir/test.cc');
        assert.strictEqual(WskAction.removeExtension('test'), 'test');
    });
});

suite('wskEntity.getAuthByClient', () => {
    test('Automatically put https when apihost does not contain protocol', () => {
        const client = openwhisk({ apihost: 'api.openwhisk.com', api_key: '1234:5678' });
        assert.deepEqual(getAuthByClient(client), {
            apihost: 'https://api.openwhisk.com',
            api_key: '1234:5678',
        });
    });

    test('Follow explicit protocol: https', () => {
        const client = openwhisk({ apihost: 'https://api.openwhisk.com', api_key: '1234:5678' });
        assert.deepEqual(getAuthByClient(client), {
            apihost: 'https://api.openwhisk.com',
            api_key: '1234:5678',
        });
    });

    test('Follow explicit protocol: http', () => {
        const client = openwhisk({ apihost: 'http://api.openwhisk.com', api_key: '1234:5678' });
        assert.deepEqual(getAuthByClient(client), {
            apihost: 'http://api.openwhisk.com',
            api_key: '1234:5678',
        });
    });
});

suite('wskEntity.WskAction.getFullName', () => {
    const mockedClient = {
        actions: {
            client: {
                options: {
                    api: 'https://example.com',
                    apiKey: '12345678:qwertyui',
                },
            },
        },
    };

    const mockedAction: openwhisk.ActionDesc = {
        name: 'testAction',
        annotations: [
            {
                key: 'exec',
                value: 'nodejs:default',
            },
        ],
    };

    const mockedPackage: openwhisk.PackageDesc = {
        name: 'testPackage',
    };

    test('Get full name of action outside of package', () => {
        const a = new WskAction(
            'testAction',
            (mockedClient as unknown) as openwhisk.Client,
            mockedAction
        );
        assert.deepStrictEqual(a.getFullName(), 'testAction');
    });

    test('Get full name of action inside of package', () => {
        const a = new WskAction(
            'testAction',
            (mockedClient as unknown) as openwhisk.Client,
            mockedAction,
            mockedPackage
        );
        assert.deepStrictEqual(a.getFullName(), 'testPackage/testAction');
    });
});
