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

export interface SavedNamespaceState {
    name: string;
    api_key: string;
}

export interface SavedEndpointState {
    alias: string;
    apihost: string;
    namespaces: SavedNamespaceState[];
}

export type StorageEndpointEntryType = { [key: string]: SavedEndpointState };

/**
 * StorageManager is used to permanently store the plugin data.
 * This stores the wskdeploy local file path, API Host, and API authentication key.
 */
export class StorageManager {
    static readonly KEY_WSKDEPLOY_PATH = 'wskdeployPath';
    static readonly KEY_ENDPOINTS = 'endpoints';

    constructor(public state: vscode.Memento) {}

    getWskdeployPath(): vscode.Uri | undefined {
        return this.state.get<vscode.Uri>(StorageManager.KEY_WSKDEPLOY_PATH);
    }

    setWskdeployPath(uri: vscode.Uri): Thenable<void> {
        return this.state.update(StorageManager.KEY_WSKDEPLOY_PATH, uri);
    }

    getEndpoints(): StorageEndpointEntryType {
        const endpoints = this.state.get<StorageEndpointEntryType>(StorageManager.KEY_ENDPOINTS);
        if (endpoints === undefined) {
            this.state.update(StorageManager.KEY_ENDPOINTS, {});
            return {};
        }
        return endpoints;
    }

    getNamespaces(endpointName: string): SavedNamespaceState[] | undefined {
        const endpoints = this.state.get<StorageEndpointEntryType>(StorageManager.KEY_ENDPOINTS);

        if (typeof endpoints !== 'undefined' && !!endpoints[endpointName]) {
            return endpoints[endpointName]['namespaces'];
        }
        return undefined;
    }

    getNamespace(endpointName: string, namespaceName: string): SavedNamespaceState | undefined {
        const namespaces: SavedNamespaceState[] | undefined = this.getNamespaces(endpointName);

        if (typeof namespaces !== 'undefined') {
            return namespaces.find((namespace) => namespace.name === namespaceName);
        }
        return undefined;
    }

    updateEndpoints(apihost: string, newEndpoint: SavedEndpointState): Thenable<void> {
        const endpoints: StorageEndpointEntryType | undefined = this.state.get(
            StorageManager.KEY_ENDPOINTS
        );

        let newEndpoints;
        if (endpoints === undefined) {
            newEndpoints = { [apihost]: newEndpoint };
        } else {
            newEndpoints = { ...endpoints, [apihost]: newEndpoint };
        }
        return this.state.update(StorageManager.KEY_ENDPOINTS, newEndpoints);
    }

    addNamespace(apihost: string, newNamespace: SavedNamespaceState): Thenable<void> {
        const endpoints = this.getEndpoints();

        if (endpoints[apihost] === undefined) {
            throw new Error('Host does not exist');
        }
        endpoints[apihost].namespaces.push(newNamespace);
        return this.state.update(StorageManager.KEY_ENDPOINTS, endpoints);
    }
}
