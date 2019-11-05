/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as fs from 'fs';
//import * as path from 'path';
import * as rpc from "vscode-ws-jsonrpc";
import * as server from "vscode-ws-jsonrpc/lib/server";
import * as lsp from "vscode-languageserver";

export function launch(socket: rpc.IWebSocket, language: string) {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);

    // start the language servers as external processes
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());

    const language_server_map = new Map<string, any>();

    if(language == 'python2') {
        const py2ServerConnection = server.createServerProcess('PYTHON2', 'python', ["-m", "pyls"]);
        language_server_map.set('python2', py2ServerConnection)
    } else if(language == 'python3') {
        const py3ServerConnection = server.createServerProcess('PYTHON3', 'python3', ["-m", "pyls"]);
        language_server_map.set('python3', py3ServerConnection)
    } else if(language == 'javascript') {
        const jsServerConnection = server.createServerProcess('JAVASCRIPT', 'node', ["/home/careerstack/webapps/javascript-typescript-langserver/lib/language-server-stdio"]);
        language_server_map.set('javascript', jsServerConnection)
    } else if(language == 'cpp') {
        const cppServerConnection = server.createServerProcess('CPP', 'sh', ["/home/careerstack/webapps/cquery/build/release/bin/start_cquery.sh"]);
        language_server_map.set('cpp', cppServerConnection)
        language_server_map.set('c', cppServerConnection)
        language_server_map.set('objective-c', cppServerConnection)
    } else if(language == 'csharp') {
        const csharpServerConnection = server.createServerProcess('CSHARP', '/home/careerstack/webapps/omnisharp-roslyn/artifacts/scripts/OmniSharp.Stdio', ["-lsp", "-s", "/home/careerstack/lsp_files"]);
        language_server_map.set('csharp', csharpServerConnection)
    } else if(language == 'java') {
        const javaServerConnection = server.createServerProcess('JAVA', 'java', [
                                                                                "-Dfile.encoding=UTF-8",
                                                                                "-Declipse.application=org.eclipse.jdt.ls.core.id1",
                                                                                "-Dosgi.bundles.defaultStartLevel=4",
                                                                                "-Declipse.product=org.eclipse.jdt.ls.core.product",
                                                                                "-Dlog.level=ALL",
                                                                                "-jar", "/home/careerstack/webapps/eclipse.jdt.ls/org.eclipse.jdt.ls.product/target/repository/plugins/org.eclipse.equinox.launcher_1.5.600.v20191014-2022.jar",
                                                                                "-configuration", "/home/careerstack/webapps/eclipse.jdt.ls/org.eclipse.jdt.ls.product/target/repository/config_linux",
                                                                                "-data", "/home/careerstack/lsp_files"
                                                                             ]);
        language_server_map.set('java', javaServerConnection)
    }


    const serverConnection = language_server_map.get(language);

    server.forward(socketConnection, serverConnection, message => {
        if (rpc.isRequestMessage(message)) {
            if (message.method === lsp.InitializeRequest.type.method) {
                const initializeParams = message.params as lsp.InitializeParams;
                initializeParams.processId = process.pid;
                initializeParams.rootPath = '/home/careerstack/lsp_files';
                initializeParams.rootUri = 'file:///home/careerstack/lsp_files';
                console.log('PID: ', process.pid, language);
            }
        }
        if (rpc.isNotificationMessage(message)) {
            switch (message.method) {
                case lsp.DidOpenTextDocumentNotification.type.method: {
                    const didOpenParams = message.params as lsp.DidOpenTextDocumentParams;
                    const uri = didOpenParams.textDocument.uri;
                    const text = didOpenParams.textDocument.text;
                    if (uri) fs.writeFileSync(uri.replace('file://', ''), text)
                    break;
                }
            }
        }
        return message;
    });
}
