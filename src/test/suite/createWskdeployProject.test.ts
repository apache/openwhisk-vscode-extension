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
import * as vscode from 'vscode';
import { resolve } from 'path';
import { existsSync, writeFileSync } from 'fs';
import { afterEach } from 'mocha';
import * as rimraf from 'rimraf';
import { createWskdeployProject } from '../../commands/createWskdeployProject';
import { expect } from 'chai';

import sinon = require('sinon');
import { TEST_FIXTURES_PATH } from '../../constant/path';

const MANIFESTFILE_PATH = resolve(TEST_FIXTURES_PATH, 'manifest.yaml');
const SRC_DIR_PATH = resolve(TEST_FIXTURES_PATH, 'src');

const timeout = (ms: number): Thenable<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

suite('templateGenerator.createWskdeployProject', async function () {
    test('Create wskdeploy project files', async () => {
        const fakeConfirm = sinon.fake.returns(Promise.resolve({ action: 'confirm' }));
        sinon.replace(vscode.window, 'showInformationMessage', fakeConfirm);
        await createWskdeployProject();
        await timeout(1000);
        expect(existsSync(MANIFESTFILE_PATH)).to.be.true;
    });

    test('Show warning message if manifest file exists', async () => {
        writeFileSync(MANIFESTFILE_PATH, '');
        sinon.spy(vscode.window, 'showErrorMessage');
        await createWskdeployProject();
        // @ts-ignore
        const spyCall = vscode.window.showErrorMessage.getCall(0);
        expect(spyCall.args[0].includes('already exists')).to.be.true;
    });

    afterEach(() => {
        rimraf.sync(SRC_DIR_PATH);
        rimraf.sync(MANIFESTFILE_PATH);
    });
});
