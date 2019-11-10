 /*--------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as $ from 'jquery'
import { listen, MessageConnection } from 'vscode-ws-jsonrpc';
import {
    MonacoLanguageClient, CloseAction, ErrorAction,
    MonacoServices, createConnection
} from 'monaco-languageclient';
//import normalizeUrl = require('normalize-url');
const ReconnectingWebSocket = require('reconnecting-websocket');

require('monaco-languages/release/dev/python/python.contribution')
require('monaco-languages/release/dev/java/java.contribution')
require('monaco-languages/release/dev/javascript/javascript.contribution')
//require('monaco-languages/release/dev/c/c.contribution')
require('monaco-languages/release/dev/cpp/cpp.contribution')
require('monaco-languages/release/dev/objective-c/objective-c.contribution')
require('monaco-languages/release/dev/csharp/csharp.contribution')


// register Monaco languages
/*
monaco.languages.register({
    id: 'json',
    extensions: ['.json', '.bowerrc', '.jshintrc', '.jscsrc', '.eslintrc', '.babelrc'],
    aliases: ['JSON', 'json'],
    mimetypes: ['application/json'],
});

monaco.languages.register({
    id: 'python',
    extensions: ['.py'],
    aliases: ['PY', 'py'],
    mimetypes: ['application/python'],
});

monaco.languages.register({
    id: 'c',
    extensions: ['.c'],
    aliases: ['C', 'c'],
    mimetypes: ['application/c'],
});

monaco.languages.register({
    id: 'cpp',
    extensions: ['.cpp'],
    aliases: ['CPP', 'cpp'],
    mimetypes: ['application/cpp'],
});

monaco.languages.register({
    id: 'objective-c',
    extensions: ['.m'],
    aliases: ['M', 'm'],
    mimetypes: ['application/objective-c'],
});

monaco.languages.register({
    id: 'javascript',
    extensions: ['.js'],
    aliases: ['JS', 'js'],
    mimetypes: ['application/javascript'],
});

monaco.languages.register({
    id: 'java',
    extensions: ['.java'],
    aliases: ['JAVA', 'java'],
    mimetypes: ['application/java'],
});

monaco.languages.register({
    id: 'csharp',
    extensions: ['.cs', '.csx'],
    aliases: ['CSHARP', 'csharp'],
    mimetypes: ['application/csharp'],
});

monaco.languages.register({
    id: 'typescript',
    extensions: ['.ts'],
    aliases: ['TYPESCRIPT', 'typescript'],
    mimetypes: ['application/typescript']
});
*/


function createLanguageClient(connection: MessageConnection, language: string): MonacoLanguageClient {
    if (language == 'python2' || language == 'python3') {
        var baseLanguage = 'python';
    } else {
        var baseLanguage = language;
    }

    return new MonacoLanguageClient({
        name: "Sample Language Client",
        clientOptions: {
            // use a language id as a document selector
            documentSelector: [baseLanguage],
            // disable the default error handler
            errorHandler: {
                error: () => ErrorAction.Continue,
                closed: () => CloseAction.DoNotRestart
            }
        },
        // create a language client connection from the JSON RPC connection on demand
        connectionProvider: {
            get: (errorHandler, closeHandler) => {
                return Promise.resolve(createConnection(connection, errorHandler, closeHandler))
            }
        }
    });
}

/*
function createUrl(path: string): string {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return normalizeUrl(`${protocol}://${location.host}${location.pathname}${path}`);
}
*/

function createWebSocket(url: string): WebSocket {
    const socketOptions = {
        maxReconnectionDelay: 10000,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.3,
        connectionTimeout: 10000,
        maxRetries: Infinity,
        debug: false
    };
    return new ReconnectingWebSocket(url, [], socketOptions);
}


/****************************************************************************************************/
$(document).ready(function() {
	const MODES = new Map<string, string>();
	monaco.languages.getLanguages().forEach(function(item) {
		const lang: string = item.id;
		const url = 'https://microsoft.github.io/monaco-editor/index/samples/sample.' + lang + '.txt';
		MODES.set(lang, url)
    });

    (<any>window).editor = monaco.editor.create(document.getElementById("monaco-editor")!, {
        model: null,
        theme: 'vs-dark',
        autoIndent: true,
        codeLens: false,
        cursorBlinking: 'blink',
        dragAndDrop: true,
        //gotoLocation: {
        //	multiple: "goto"
        //},
        //glyphMargin: true,
        //lightbulb: {
        //	enabled: true
        //},
    });
    // install Monaco language client services
    const options = {rootUri: 'file:///home/careerstack/lsp_files'};
    MonacoServices.install((<any>window).editor, options);

    const pySampleUrl = MODES.get('python') || 'null';
    loadSample('python2', pySampleUrl);

	$(".language-picker").change(function() {
        const language:any = $(this).children("option:selected").val() || 'python2';

        // Custom handling for python variants
        if (language == 'python2' || language == 'python3') {
            var sampleUrl = MODES.get('python')
        } else {
            var sampleUrl = MODES.get(language);
        }

		if(typeof language !== 'undefined' && typeof sampleUrl !== 'undefined') {
    		loadSample(language.toString(), sampleUrl);
		}
	});
});

function loadSample(language: string, sampleUrl: string) {
    if (language == 'python2' || language == 'python3') {
        var baseLanguage = 'python';
    } else {
        var baseLanguage = language;
    }

	$.ajax({
		type: 'GET',
		url: sampleUrl,
		dataType: 'text',
		error: function () {
			//if (typeof editor !== 'undefined') {
			//	if (editor.getModel()) {
			//		editor.getModel().dispose();
			//	}
			//	editor.dispose();
			//	editor = null;
            //}
            console.log("loadSample failed!!");
			$('#monaco-editor').empty();
			$('#monaco-editor').append('<p class="alert alert-error">Failed to load ' + language + ' sample</p>');
		}
    }).done(function (data) {
        //$('#monaco-editor').empty();

        if((<any>window).editor) {
            /*
            const oldModel = (<any>window).editor.getModel();
			if (oldModel) {
			    oldModel.dispose();
            }
            */
            //(<any>window).editor.dispose();
            //(<any>window).editor = null;
        }

        if((<any>window).webSocket) {
            (<any>window).webSocket.close(1000, 'Some reason.', {keepClosed: true, fastClose: true, delay: 0});
            console.log(">>>> Websocker conn closed.");
        }

		const language_ext_map = new Map<string, string>();
		language_ext_map.set('c', 'c')
		language_ext_map.set('cpp', 'cpp')
		language_ext_map.set('objective-c', 'm')
		language_ext_map.set('python', 'py')
		language_ext_map.set('java', 'java')
		language_ext_map.set('javascript', 'js')
		language_ext_map.set('csharp', 'csx')

        const workingDir = "/home/careerstack/lsp_files";
		const suffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		const fileext = language_ext_map.get(baseLanguage);
		const filename = "file_" + suffix + "." + fileext;
        const filepath = workingDir + "/" + filename;

        const oldModel = (<any>window).editor.getModel();
        const newModel = monaco.editor.createModel(data, baseLanguage, monaco.Uri.file(filepath));
        (<any>window).editor.setModel(newModel);
        if(oldModel) {
            oldModel.dispose();
        }

		// create the web socket
        const url = 'wss://analytics-migration.hackerearth.com/sampleServer/?language=' + language;
        const webSocket = createWebSocket(url);
        (<any>window).webSocket = webSocket;
        console.log("==== Websocker conn opened.");

		// listen when the web socket is opened
		listen({
            webSocket,
            onConnection: connection => {
                console.log("Websocket conn estd!");
				// create and start the language client
				const languageClient = createLanguageClient(connection, language);
				const disposable = languageClient.start();
                connection.onClose(() => {disposable.dispose(); console.log("Language client disposed!");});
			}
		});
	});
}
