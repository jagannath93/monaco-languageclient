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
    const jsServerConnection = server.createServerProcess('JS', 'flow-language-server', ["--try-flow-bin", "--stdio"]);
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
    const pyServerConnection = server.createServerProcess('PYTHON', 'pyls');
    const cppServerConnection = server.createServerProcess('CPP', 'sh', ["/home/hackerearth/hackerearth/cquery/build/start_cquery.sh"]);
    const csharpServerConnection = server.createServerProcess('CSHARP', '/home/hackerearth/hackerearth/omnisharp-roslyn/artifacts/scripts/OmniSharp.Stdio', ["-lsp", "-s", "/home/hackerearth/cquery_files"]);
    const javaServerConnection = server.createServerProcess('JAVA', 'java', [
                                                                            "-Dfile.encoding=UTF-8",
                                                                            "-Declipse.application=org.eclipse.jdt.ls.core.id1",
                                                                            "-Dosgi.bundles.defaultStartLevel=4",
                                                                            "-Declipse.product=org.eclipse.jdt.ls.core.product",
                                                                            "-Dlog.level=ALL",
                                                                            "-jar", "/home/hackerearth/hackerearth/eclipse.jdt.ls/org.eclipse.jdt.ls.product/target/repository/plugins/org.eclipse.equinox.launcher_1.5.600.v20191014-2022.jar",
                                                                            "-configuration", "/home/hackerearth/hackerearth/eclipse.jdt.ls/org.eclipse.jdt.ls.product/target/repository/config_linux",
                                                                            "-data", "/home/hackerearth/cquery_files"
                                                                         ]);
    const language_server_map = new Map<string, any>();
    language_server_map.set('javascript', jsServerConnection)
    language_server_map.set('c', cppServerConnection)
    language_server_map.set('cpp', cppServerConnection)
    language_server_map.set('objective-c', cppServerConnection)
    language_server_map.set('java', javaServerConnection)
    language_server_map.set('python', pyServerConnection)
    language_server_map.set('csharp', csharpServerConnection)

    const serverConnection = language_server_map.get(language);

    server.forward(socketConnection, serverConnection, message => {
        if (rpc.isRequestMessage(message)) {
            if (message.method === lsp.InitializeRequest.type.method) {
                const initializeParams = message.params as lsp.InitializeParams;
                initializeParams.processId = process.pid;
                initializeParams.rootPath = '/home/hackerearth/cquery_files';
                initializeParams.rootUri = 'file:///home/hackerearth/cquery_files';
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
