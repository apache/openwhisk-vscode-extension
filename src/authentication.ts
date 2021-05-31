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
/* eslint-disable @typescript-eslint/camelcase */
import * as fs from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface AuthInfo {
    api_key: string;
    apihost: string;
    api?: string;
    namespace?: string;
    ignore_certs?: boolean;
    apigw_token?: string;
    apigw_space_quid?: string;
}

async function readWskPropFile(path: string): Promise<AuthInfo | null> {
    const regex = /^[^=]+=(.*)$/;
    const properties: AuthInfo = {
        api_key: '',
        apihost: '',
    };

    let propFile: string;
    try {
        propFile = await fs.promises.readFile(path, 'ascii');
    } catch (e) {
        return Promise.resolve(null);
    }

    propFile.split('\n').forEach((line: string) => {
        if (line.match(regex)) {
            const keyvalue = line.split('=');
            switch (keyvalue[0]) {
                case 'AUTH':
                    properties.api_key = keyvalue[1];
                    break;
                case 'APIHOST':
                    properties.apihost = keyvalue[1];
                    break;
                case 'APIGW_ACCESS_TOKEN':
                    properties.apigw_token = keyvalue[1];
                    break;
                case 'APIGW_TENANT_ID':
                    properties.apigw_space_quid = keyvalue[1];
                    break;
            }
        }
    });

    if (!!properties.api_key && !!properties.apihost) {
        return Promise.resolve(properties);
    }
    return Promise.resolve(null);
}

export function getLocalAuthInfo(): Promise<AuthInfo | null> {
    const wskPropEnvVarName = 'WSK_CONFIG_FILE';

    const wskPropFilePath =
        typeof process.env[wskPropEnvVarName] === undefined
            ? (process.env[wskPropEnvVarName] as string)
            : join(homedir(), '.wskprops');

    return readWskPropFile(wskPropFilePath);
}
