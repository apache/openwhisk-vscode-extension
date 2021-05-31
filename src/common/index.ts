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
import { KeyVal } from 'openwhisk';

export async function showConfirmMessage(message: string, action = 'delete') {
    const res: any = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        { action: 'confirm', title: action, isCloseAffordance: false },
        { action: 'cancel', title: 'Cancel', isCloseAffordance: true }
    );
    return res.action === 'confirm';
}

export function convertKeyValToObj(keyval: KeyVal[]): Record<string, any> {
    return keyval.reduce((acc: { [key: string]: string }, cur) => {
        acc[cur.key] = cur.value;
        return acc;
    }, {});
}

export function convertObjToKeyVal(object: { [key: string]: any }): KeyVal[] {
    return Object.keys(object).map((key) => {
        return {
            key: key,
            value: object[key],
        };
    });
}
