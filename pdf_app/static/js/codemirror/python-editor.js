/**
 * Python Editor initialization for CodeMirror
 */
function initPythonEditor(executeUrl, isExistingFunction) {
    // Initialize CodeMirror for Python code
    const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'python',
        theme: 'monokai',
        lineNumbers: true,
        indentUnit: 4,
        smartIndent: true,
        indentWithTabs: false,
        matchBrackets: true,
        autoCloseBrackets: true,
        styleActiveLine: true,
        extraKeys: {
            "Tab": function(cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("    ", "end");
                }
            },
            "Shift-Tab": function(cm) {
                cm.indentSelection("subtract");
            },
            "Ctrl-/": "toggleComment"
        }
    });

    // Initialize CodeMirror for function parameters
    const argsEditor = CodeMirror.fromTextArea(document.getElementById('function-args'), {
        mode: 'python',
        theme: 'monokai',
        lineNumbers: true,
        indentUnit: 4,
        smartIndent: true,
        indentWithTabs: false,
        matchBrackets: true,
        autoCloseBrackets: true,
        styleActiveLine: true,
        extraKeys: {
            "Tab": function(cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("    ", "end");
                }
            },
            "Shift-Tab": function(cm) {
                cm.indentSelection("subtract");
            },
            "Ctrl-/": "toggleComment"
        }
    });

    // Execute button handler
    const executeButton = document.getElementById('execute-button');
    const resultsOutput = document.getElementById('results-output');
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    executeButton.addEventListener('click', function() {
        // Get current code and args
        const code = codeEditor.getValue();
        const argsCode = argsEditor.getValue();

        // Show loading state
        executeButton.disabled = true;
        executeButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Executing...';
        resultsOutput.innerHTML = '<div class="text-gray-400">Executing function...</div>';

        // Determine which endpoint to use
        let requestData, headers;
        
        if (isExistingFunction) {
            requestData = `args_code=${encodeURIComponent(argsCode)}`;
            headers = {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/x-www-form-urlencoded'
            };
        } else {
            requestData = JSON.stringify({
                code: code,
                args_code: argsCode
            });
            headers = {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json'
            };
        }
        
        // Execute the function via API
        fetch(executeUrl, {
            method: 'POST',
            headers: headers,
            body: requestData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let output = data.output || '';
                let result = data.result || '';
                
                resultsOutput.innerHTML = 
                    '<div class="mb-2">' +
                    '<h5 class="text-sm font-medium">Function output:</h5>' +
                    '<pre class="bg-gray-100 p-2 rounded">' + output + '</pre>' +
                    '</div>' +
                    '<div>' +
                    '<h5 class="text-sm font-medium">Return value:</h5>' +
                    '<pre class="bg-gray-100 p-2 rounded">' + result + '</pre>' +
                    '</div>';
            } else {
                resultsOutput.innerHTML = 
                    '<div class="error-message">' +
                    '<h5 class="font-medium">Error:</h5>' +
                    '<pre>' + data.error + '</pre>' +
                    (data.traceback ? '<details><summary>Traceback</summary><pre>' + data.traceback + '</pre></details>' : '') +
                    '</div>';
            }
        })
        .catch(error => {
            resultsOutput.innerHTML = '<div class="error-message">Failed to execute: ' + error.message + '</div>';
        })
        .finally(() => {
            executeButton.disabled = false;
            executeButton.innerHTML = '<i class="fas fa-play mr-2"></i> Execute Function';
        });
    });

    // Basic linting
    function lintCode() {
        // This is a simplified linting, Python server-side validation will be more thorough
        const code = codeEditor.getValue();
        const lintErrors = document.getElementById('lintErrors');
        const lintErrorsList = document.getElementById('lintErrorsList');
        const errors = [];

        // Simple checks
        if (code.includes('import os') || code.includes('import sys')) {
            errors.push('Security warning: Importing system modules is restricted');
        }

        // Update UI
        if (errors.length > 0) {
            lintErrorsList.innerHTML = '';
            errors.forEach(error => {
                const li = document.createElement('li');
                li.textContent = error;
                lintErrorsList.appendChild(li);
            });
            lintErrors.classList.remove('hidden');
        } else {
            lintErrors.classList.add('hidden');
        }
    }

    // Add event listener for linting
    codeEditor.on('change', function() {
        lintCode();
    });

    // Run initial lint
    lintCode();
    
    return {
        codeEditor,
        argsEditor
    };
} 