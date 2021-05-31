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
import { resolve } from 'path';
import { RESOURCE_PATH } from './path';
const BASE_PATH = resolve(RESOURCE_PATH, 'template/actioncode');

export class Runtime {
    public static readonly NODEJS = 'nodejs';
    public static readonly JAVA = 'java';
    public static readonly GO = 'go';
    public static readonly PHP = 'php';
    public static readonly PYTHON = 'python';
    public static readonly DOTNET = 'dotnet';
    public static readonly RUBY = 'ruby';
    public static readonly SWIFT = 'swift';
}

export const sampleCodePath: Record<string, string> = {
    [Runtime.NODEJS]: resolve(BASE_PATH, 'sample.js'),
    [Runtime.JAVA]: resolve(BASE_PATH, 'sample.java'),
    [Runtime.GO]: resolve(BASE_PATH, 'sample.go'),
    [Runtime.PHP]: resolve(BASE_PATH, 'sample.php'),
    [Runtime.PYTHON]: resolve(BASE_PATH, 'sample.py'),
    [Runtime.DOTNET]: resolve(BASE_PATH, 'sample.cs'),
    [Runtime.RUBY]: resolve(BASE_PATH, 'sample.rb'),
    [Runtime.SWIFT]: resolve(BASE_PATH, 'sample.swift'),
} as const;

export const runtimes = [
    {
        kind: Runtime.NODEJS,
        versions: ['12', '10', '8'],
    },
    {
        kind: Runtime.PYTHON,
        versions: ['3', '2'],
    },
    {
        kind: Runtime.SWIFT,
        versions: ['5.1', '4.2'],
    },
    {
        kind: Runtime.PHP,
        versions: ['7.4', '7.3'],
    },
    {
        kind: Runtime.RUBY,
        versions: ['2.5'],
    },
    {
        kind: Runtime.GO,
        versions: ['1.11'],
    },
    {
        kind: Runtime.DOTNET,
        versions: ['3.1', '2.2'],
    },
];
