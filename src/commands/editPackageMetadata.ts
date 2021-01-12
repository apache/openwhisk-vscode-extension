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

import { WskPackage } from '../wskEntity';
import { convertKeyValToObj, convertObjToKeyVal } from '../common';
import { openMetadatEditor } from './common/openMetadataEditor';

export async function editPackageMetadata(
    pkg: WskPackage,
    context: vscode.ExtensionContext
): Promise<void> {
    const packageName = pkg.packageDesc.name as string;
    const remotePackage = await pkg.getRemotePackage();

    const parameters = convertKeyValToObj(remotePackage.parameters || []);
    const annotations = convertKeyValToObj(remotePackage.annotations || []);

    const updatePackageMetadata = async (params: object, annotations: object): Promise<void> => {
        try {
            await pkg.updateRemotePackage({
                parameters: convertObjToKeyVal(params),
                annotations: convertObjToKeyVal(annotations),
            });
            vscode.window.showInformationMessage('The package is updated succesfully.');
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to update the package (${e.message})`);
        }
    };
    await openMetadatEditor(
        'editPackageMetadata',
        `Edit package metadata: ${packageName}`,
        context,
        parameters,
        annotations,
        undefined,
        updatePackageMetadata
    );
}
