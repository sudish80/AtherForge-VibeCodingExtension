import * as vscode from 'vscode';

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'atherforge.css'));
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'atherforge.js'));
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atherforge</title>
  <link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="brand-dot"></span>
        <div>
          <div class="brand-title">Atherforge</div>
          <div class="brand-sub">Multi-model vibe coding cockpit</div>
        </div>
      </div>
      <div class="actions">
        <button class="ghost" id="newChat">New Chat</button>
        <button class="ghost" id="toggleTheme" title="Toggle Dark Mode">🌙</button>
      </div>
    </header>

    <div class="mode-switch">
      <button class="mode active" data-mode="chat">Chat</button>
      <button class="mode" data-mode="pipeline">Pipeline</button>
      <span class="mode-glow"></span>
    </div>

    <main class="content">
      <section class="panel chat-panel active" data-panel="chat">
        <div class="chat-header">
          <h2>💬 Chat</h2>
          <div class="model-selector">
            <label>Model:</label>
            <select id="modelSelect">
              <optgroup label="Frontend Coding">
                <option value="codeLlama">🦙 Code Llama</option>
                <option value="starcoder2">⭐ StarCoder2</option>
                <option value="qwen2_5Coder">🔢 Qwen2.5-Coder</option>
              </optgroup>
              <optgroup label="Backend Coding">
                <option value="claude35">🤖 Claude 3.5</option>
                <option value="deepseekCoder">🔻 DeepSeek Coder</option>
              </optgroup>
              <optgroup label="Reasoning">
                <option value="llama3_32k">🦙 LLaMA 3 32K</option>
                <option value="gemini1_5">🌟 Gemini 1.5</option>
                <option value="phi3Medium">Φ Phi-3 Medium</option>
              </optgroup>
              <optgroup label="Debugging">
                <option value="codeLlamaInstruct">🔧 Code Llama Instruct</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div class="chat-messages" id="chatMessages">
          <div class="welcome-message">
            <h3>👋 Welcome to Atherforge</h3>
            <p>Select a model above and start chatting. Your AI coding assistant is ready to help!</p>
          </div>
        </div>

        <div class="chat-input-area">
          <div class="input-wrapper">
            <textarea id="promptInput" rows="3" placeholder="Ask me anything about your code..." spellcheck="false"></textarea>
            <div class="input-actions">
              <button class="icon-btn" id="attachFile" title="Attach file">📎</button>
              <button class="icon-btn" id="clearChat" title="Clear chat">🗑️</button>
            </div>
          </div>
          <button id="sendPrompt" class="send-btn">
            <span>Send</span>
            <span class="send-icon">➤</span>
          </button>
        </div>

        <div class="tool-dock">
          <details open>
            <summary>⚡ Full Access Mode</summary>
            <div class="tool-grid">
              <div class="tool full-access">
                <div class="access-badge">🚀 FULL AUTONOMY</div>
                <label>Terminal Command</label>
                <input id="terminalCmd" placeholder="npm run build" />
                <button id="runTerminal">Execute</button>
                <div class="tool-output" id="terminalOutput"></div>
              </div>
              <div class="tool full-access">
                <label>Create Directory</label>
                <input id="createDirPath" placeholder="src/new/folder" />
                <button id="createDir">Create</button>
              </div>
              <div class="tool full-access">
                <label>Delete File/Folder</label>
                <input id="deletePath" placeholder="temp/file.txt" />
                <button id="deleteItem" class="danger">Delete</button>
              </div>
              <div class="tool full-access">
                <label>List All Files</label>
                <input id="listPath" placeholder="." />
                <button id="listAllFiles">List</button>
                <div class="tool-list" id="allFilesList"></div>
              </div>
              <div class="tool full-access">
                <label>Run Git Command</label>
                <input id="gitCmd" placeholder="git status" />
                <button id="runGit">Run Git</button>
                <div class="tool-output" id="gitOutput"></div>
              </div>
              <div class="tool full-access">
                <label>VS Code Command</label>
                <input id="vscodeCmd" placeholder="workbench.action.toggleSidebarVisibility" />
                <button id="runVscode">Execute</button>
              </div>
            </div>
          </details>
          <details>
            <summary>Workspace Tools</summary>
            <div class="tool-grid">
              <div class="tool">
                <label>Read file</label>
                <input id="readPath" placeholder="src/extension.ts" />
                <button id="readFile">Read</button>
              </div>
              <div class="tool">
                <label>Write file</label>
                <input id="writePath" placeholder="notes/todo.md" />
                <textarea id="writeContent" rows="3" placeholder="File content..."></textarea>
                <button id="writeFile">Write</button>
              </div>
              <div class="tool">
                <label>File tree</label>
                <button id="refreshTree">Refresh</button>
                <div class="tool-list" id="fileTree"></div>
              </div>
              <div class="tool">
                <label>GitHub commit</label>
                <input id="ghOwner" placeholder="owner" />
                <input id="ghRepo" placeholder="repo" />
                <input id="ghPath" placeholder="path/in/repo.txt" />
                <input id="ghBranch" placeholder="main" />
                <input id="ghMessage" placeholder="commit message" />
                <textarea id="ghContent" rows="3" placeholder="File content..."></textarea>
                <button id="ghCommit">Commit via API</button>
              </div>
              <div class="tool">
                <label>GitHub repo browser</label>
                <input id="repoOwner" placeholder="owner" />
                <input id="repoName" placeholder="repo" />
                <input id="repoBranch" placeholder="main" />
                <input id="repoPath" placeholder="path (optional)" />
                <div class="button-row">
                  <button id="repoFetch">Fetch list</button>
                  <button id="repoBranches">Branches</button>
                </div>
                <div class="tool-list" id="repoList"></div>
                <label>Repo editor</label>
                <input id="repoFilePath" placeholder="path/to/file.ts" />
                <textarea id="repoFileContent" rows="4" placeholder="File content..."></textarea>
                <input id="repoCommitMessage" placeholder="commit message" />
                <div class="button-row">
                  <button id="repoOpen">Open file</button>
                  <button id="repoCommit">Commit file</button>
                </div>
              </div>
              <div class="tool">
                <label>Feature ideas</label>
                <button id="suggestFeatures">Suggest ideas</button>
                <div class="tool-list" id="suggestionsList"></div>
              </div>
              <div class="tool">
                <label>Auth vault</label>
                <input id="vaultFrontend" placeholder="Frontend-Code-Llama key" />
                <input id="vaultBackend" placeholder="Backend-Claude key" />
                <input id="vaultReasoning" placeholder="Reasoning LLaMA key" />
                <input id="vaultGithub" placeholder="GitHub token" />
                <button id="saveVault">Save to vault</button>
              </div>
              <div class="tool">
                <label>Presets</label>
                <input id="presetName" placeholder="Preset name" />
                <div class="button-row">
                  <button id="savePreset">Save preset</button>
                  <button id="loadPreset">Load preset</button>
                </div>
                <div class="tool-list" id="presetList"></div>
              </div>
              <div class="tool">
                <label>Execution history</label>
                <button id="refreshHistory">Refresh history</button>
                <div class="tool-list" id="historyList"></div>
              </div>
              <div class="tool">
                <label>Diff viewer</label>
                <div class="tool-list" id="diffViewer"></div>
              </div>
              <div class="tool">
                <label>Settings</label>
                <button id="openSettings">⚙️ Settings</button>
                <div class="settings-panel" id="settingsPanel">
                  <div class="settings-group">
                    <h4>Terminal</h4>
                    <label class="checkbox-label">
                      <input type="checkbox" id="terminalAutoRun" />
                      Auto-run terminal commands
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" id="terminalShowOutput" checked />
                      Show terminal output
                    </label>
                    <label>Default timeout (ms)</label>
                    <input type="number" id="terminalTimeout" value="60000" min="5000" max="300000" />
                  </div>
                  <div class="settings-group">
                    <h4>File Creation</h4>
                    <label class="checkbox-label">
                      <input type="checkbox" id="autoCreateDirs" checked />
                      Auto-create directories
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" id="confirmDelete" checked />
                      Confirm before delete
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" id="useTrash" checked />
                      Move to trash (not permanent delete)
                    </label>
                  </div>
                  <div class="settings-group">
                    <h4>Pipeline</h4>
                    <label class="checkbox-label">
                      <input type="checkbox" id="autoStartPipeline" />
                      Auto-start pipeline
                    </label>
                    <label>Max continuous retries</label>
                    <input type="number" id="maxRetries" value="10" min="1" max="100" />
                    <label class="checkbox-label">
                      <input type="checkbox" id="autoRecovery" checked />
                      Auto-recovery on errors
                    </label>
                  </div>
                  <div class="settings-group">
                    <h4>AI Models</h4>
                    <label class="checkbox-label">
                      <input type="checkbox" id="autoSelectModel" checked />
                      Auto-select model by task
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" id="showModelSuggestions" />
                      Show model suggestions
                    </label>
                  </div>
                  <div class="settings-group">
                    <h4>UI Preferences</h4>
                    <label class="checkbox-label">
                      <input type="checkbox" id="darkMode" checked />
                      Dark mode
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" id="compactMode" />
                      Compact mode
                    </label>
                  </div>
                  <div class="button-row">
                    <button id="saveSettings">Save Settings</button>
                    <button id="resetSettings" class="secondary">Reset</button>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

      <section class="panel pipeline-panel" data-panel="pipeline">
        <div class="pipeline-header">
          <div class="pipeline-title">Flow Builder</div>
          <div class="pipeline-sub">Drag nodes to wire a model pipeline</div>
        </div>
        <div class="pipeline-toolbar">
          <button id="runPipeline">▶ Run</button>
          <button id="pausePipeline" class="secondary" disabled>⏸ Pause</button>
          <button id="resumePipeline" class="secondary" disabled>⏹ Resume</button>
          <button id="stopPipeline" class="danger" disabled>⏹ Stop</button>
          <label class="toggle">
            <input type="checkbox" id="masterControl" />
            🤖 Master Control (Auto-Pilot)
          </label>
          <label class="toggle">
            <input type="checkbox" id="continuousMode" />
            🔄 Continuous
          </label>
          <label class="toggle">
            <input type="checkbox" id="humanIntervention" checked />
            👤 Human
          </label>
          <label class="toggle">
            <input type="checkbox" id="autoRoute" checked />
            Auto-route
          </label>
          <label class="toggle">
            <input type="checkbox" id="retryOnFailure" />
            🔁 Retry
          </label>
          <button id="savePipelinePreset">💾 Save</button>
          <button id="exportPipeline">📤 Export</button>
          <button id="importPipeline">📥 Import</button>
          <div class="pipeline-status" id="pipelineStatus">Idle</div>
        </div>
        <div class="pipeline-stats" id="pipelineStats">
          <div class="stat">Runs: <span id="statRuns">0</span></div>
          <div class="stat">Success: <span id="statSuccess">0</span></div>
          <div class="stat">Failed: <span id="statFailed">0</span></div>
          <div class="stat">Avg Time: <span id="statAvgTime">0s</span></div>
        </div>
        <div class="human-intervention-panel" id="humanInterventionPanel">
          <div class="intervention-header">
            <span class="intervention-title">Human Intervention Required</span>
            <span class="intervention-badge" id="interventionCount">0</span>
          </div>
          <div class="intervention-queue" id="interventionQueue"></div>
          <div class="intervention-actions">
            <button id="approveAll" class="success">✅ Approve All</button>
            <button id="rejectAll" class="danger">❌ Reject All</button>
          </div>
        </div>

        <div class="pipeline-tabs">
          <button class="pipeline-tab active" data-tab="builder">Builder</button>
          <button class="pipeline-tab" data-tab="schedule">⏰ Schedule</button>
          <button class="pipeline-tab" data-tab="analytics">📊 Analytics</button>
          <button class="pipeline-tab" data-tab="history">📜 History</button>
          <button class="pipeline-tab" data-tab="settings">⚙️ Settings</button>
        </div>

        <div class="pipeline-tab-content active" data-content="builder">
        <div class="pipeline-body">
          <aside class="palette">
            <div class="palette-title">Nodes</div>
            <button class="node-add" data-node="frontend">Frontend-Code-Llama</button>
            <button class="node-add" data-node="backend">Backend-Claude</button>
            <button class="node-add" data-node="reasoning">Reasoning LLaMA 3 32K</button>
            <button class="node-add" data-node="file-read">File Read</button>
            <button class="node-add" data-node="file-write">File Write</button>
            <button class="node-add" data-node="github-commit">GitHub Commit</button>
            <button class="node-add" data-node="git-push">Git Push</button>
            <button class="node-add" data-node="lint">Lint</button>
            <button class="node-add" data-node="test">Test</button>
          </aside>
          <div class="canvas-wrap">
            <svg class="edges" id="edgeLayer"></svg>
            <div class="canvas" id="canvas"></div>
          </div>
        </div>
        <div class="pipeline-log" id="pipelineLog"></div>
      </section>
    </main>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
