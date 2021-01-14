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
import { encodeActionUri, getAuthFromUri } from '../../wskContent';

const apihost = 'https://example.com';
const api_key =
    'MaLRdz3MXrU9L44deOPi6KrX9ywu0wFbmrCXQOHEBZjbvyOq0f6AMxUE0UdHH5:qwertyuiopasdfghjkl';
const auth = { apihost, api_key };
const uri = vscode.Uri.parse(
    'wskActionCode:action.js?apihost=https://example.com&api_key=MaLRdz3MXrU9L44deOPi6KrX9ywu0wFbmrCXQOHEBZjbvyOq0f6AMxUE0UdHH5:qwertyuiopasdfghjkl'
);

suite('wskContent.encodeAction', () => {
    test('Encode', () => {
        assert.deepEqual(encodeActionUri('action.js', auth), uri);
    });
});

suite('wskContent.decodeAction', () => {
    test('Decode', () => {
        assert.deepEqual(getAuthFromUri(uri), { apihost, api_key });
    });
});
