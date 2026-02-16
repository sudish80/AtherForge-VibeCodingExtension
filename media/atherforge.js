const vscode = acquireVsCodeApi();

const chatLog = document.getElementById('chatLog');
const promptInput = document.getElementById('promptInput');
const sendPrompt = document.getElementById('sendPrompt');
const newChat = document.getElementById('newChat');
const modeButtons = document.querySelectorAll('.mode');
const modeGlow = document.querySelector('.mode-glow');
const panelEls = document.querySelectorAll('.panel');
const tabButtons = document.querySelectorAll('.tab');

const sessions = {
  codeLlama: [],
  starcoder2: [],
  qwen2_5Coder: [],
  claude35: [],
  deepseekCoder: [],
  llama3_32k: [],
  gemini1_5: [],
  phi3Medium: [],
  codeLlamaInstruct: []
};
let activeModel = 'frontend';
let selectedPresetId = null;

const readPath = document.getElementById('readPath');
const readFileBtn = document.getElementById('readFile');
const writePath = document.getElementById('writePath');
const writeContent = document.getElementById('writeContent');
const writeFileBtn = document.getElementById('writeFile');
const ghOwner = document.getElementById('ghOwner');
const ghRepo = document.getElementById('ghRepo');
const ghPath = document.getElementById('ghPath');
const ghBranch = document.getElementById('ghBranch');
const ghMessage = document.getElementById('ghMessage');
const ghContent = document.getElementById('ghContent');
const ghCommit = document.getElementById('ghCommit');
const refreshTree = document.getElementById('refreshTree');
const fileTree = document.getElementById('fileTree');
const repoOwner = document.getElementById('repoOwner');
const repoName = document.getElementById('repoName');
const repoBranch = document.getElementById('repoBranch');
const repoPath = document.getElementById('repoPath');
const repoFetch = document.getElementById('repoFetch');
const repoBranches = document.getElementById('repoBranches');
const repoList = document.getElementById('repoList');
const repoFilePath = document.getElementById('repoFilePath');
const repoFileContent = document.getElementById('repoFileContent');
const repoCommitMessage = document.getElementById('repoCommitMessage');
const repoOpen = document.getElementById('repoOpen');
const repoCommit = document.getElementById('repoCommit');
const suggestFeatures = document.getElementById('suggestFeatures');
const suggestionsList = document.getElementById('suggestionsList');
const runPipeline = document.getElementById('runPipeline');
const pipelineLog = document.getElementById('pipelineLog');
const pipelineStatus = document.getElementById('pipelineStatus');
const autoRoute = document.getElementById('autoRoute');
const savePipelinePreset = document.getElementById('savePipelinePreset');
const vaultFrontend = document.getElementById('vaultFrontend');
const vaultBackend = document.getElementById('vaultBackend');
const vaultReasoning = document.getElementById('vaultReasoning');
const vaultGithub = document.getElementById('vaultGithub');
const saveVault = document.getElementById('saveVault');
const presetName = document.getElementById('presetName');
const savePreset = document.getElementById('savePreset');
const loadPreset = document.getElementById('loadPreset');
const presetList = document.getElementById('presetList');
const refreshHistory = document.getElementById('refreshHistory');
const historyList = document.getElementById('historyList');
const diffViewer = document.getElementById('diffViewer');

// Full Access Mode Elements
const terminalCmd = document.getElementById('terminalCmd');
const runTerminal = document.getElementById('runTerminal');
const terminalOutput = document.getElementById('terminalOutput');
const createDirPath = document.getElementById('createDirPath');
const createDir = document.getElementById('createDir');
const deletePath = document.getElementById('deletePath');
const deleteItem = document.getElementById('deleteItem');
const listPath = document.getElementById('listPath');
const listAllFiles = document.getElementById('listAllFiles');
const allFilesList = document.getElementById('allFilesList');
const gitCmd = document.getElementById('gitCmd');
const runGit = document.getElementById('runGit');
const gitOutput = document.getElementById('gitOutput');
const vscodeCmd = document.getElementById('vscodeCmd');
const runVscode = document.getElementById('runVscode');

// Settings Elements
const openSettings = document.getElementById('openSettings');
const settingsPanel = document.getElementById('settingsPanel');
const saveSettings = document.getElementById('saveSettings');
const resetSettings = document.getElementById('resetSettings');
const terminalAutoRun = document.getElementById('terminalAutoRun');
const terminalShowOutput = document.getElementById('terminalShowOutput');
const terminalTimeout = document.getElementById('terminalTimeout');
const autoCreateDirs = document.getElementById('autoCreateDirs');
const confirmDelete = document.getElementById('confirmDelete');
const useTrash = document.getElementById('useTrash');
const autoStartPipeline = document.getElementById('autoStartPipeline');
const maxRetries = document.getElementById('maxRetries');
const autoRecovery = document.getElementById('autoRecovery');
const autoSelectModel = document.getElementById('autoSelectModel');
const showModelSuggestions = document.getElementById('showModelSuggestions');
const darkMode = document.getElementById('darkMode');
const compactMode = document.getElementById('compactMode');

// Pipeline Control Elements
const pausePipeline = document.getElementById('pausePipeline');
const resumePipeline = document.getElementById('resumePipeline');
const stopPipeline = document.getElementById('stopPipeline');
const continuousMode = document.getElementById('continuousMode');
const humanInterventionToggle = document.getElementById('humanIntervention');
const humanInterventionPanel = document.getElementById('humanInterventionPanel');
const interventionQueue = document.getElementById('interventionQueue');
const interventionCount = document.getElementById('interventionCount');
const approveAll = document.getElementById('approveAll');
const rejectAll = document.getElementById('rejectAll');

// Pipeline State
let pipelineState = {
  isRunning: false,
  isPaused: false,
  isContinuous: false,
  humanInterventionEnabled: true,
  pendingInterventions: [],
  currentNodeId: null
};

function renderChat() {
  if (!chatMessages) return;
  
  // Show welcome message if no messages
  if (sessions[activeModel].length === 0) {
    chatMessages.innerHTML = `
      <div class="welcome-message">
        <h3>👋 Welcome to Atherforge</h3>
        <p>Select a model above and start chatting. Your AI coding assistant is ready to help!</p>
      </div>
    `;
    return;
  }
  
  chatMessages.innerHTML = '';
  sessions[activeModel].forEach((entry) => {
    const div = document.createElement('div');
    div.className = `message ${entry.role}`;
    const avatar = entry.role === 'user' ? '👤' : '🤖';
    div.innerHTML = `
      <div class="message-header">
        <span class="message-avatar">${avatar}</span>
        <span>${entry.role === 'user' ? 'You' : activeModel}</span>
      </div>
      <div class="message-content">${escapeHtml(entry.content)}</div>
    `;
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addMessage(role, content, modelId = activeModel) {
  sessions[modelId].push({ role, content });
  if (modelId === activeModel) {
    renderChat();
  }
}

function setActiveModel(modelId) {
  activeModel = modelId;
  tabButtons.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.model === modelId);
  });
  renderChat();
}

tabButtons.forEach((tab) => {
  tab.addEventListener('click', () => setActiveModel(tab.dataset.model));
});

sendPrompt.addEventListener('click', () => {
  const value = promptInput.value.trim();
  if (!value) {
    return;
  }
  addMessage('user', value, activeModel);
  vscode.postMessage({
    type: 'invokeModel',
    model: activeModel,
    messages: sessions[activeModel]
  });
  promptInput.value = '';
});

// Model selector change handler
if (modelSelect) {
  modelSelect.addEventListener('change', () => {
    activeModel = modelSelect.value;
    renderChat();
  });
}

// Clear chat handler
if (clearChatBtn) {
  clearChatBtn.addEventListener('click', () => {
    sessions[activeModel] = [];
    renderChat();
  });
}

newChat.addEventListener('click', () => {
  sessions[activeModel] = [];
  renderChat();
});

readFileBtn.addEventListener('click', () => {
  const targetPath = readPath.value.trim();
  if (!targetPath) {
    return;
  }
  vscode.postMessage({ type: 'readFile', path: targetPath });
});

writeFileBtn.addEventListener('click', () => {
  const targetPath = writePath.value.trim();
  if (!targetPath) {
    return;
  }
  vscode.postMessage({
    type: 'writeFile',
    path: targetPath,
    content: writeContent.value
  });
});

ghCommit.addEventListener('click', () => {
  const payload = {
    owner: ghOwner.value.trim(),
    repo: ghRepo.value.trim(),
    path: ghPath.value.trim(),
    branch: ghBranch.value.trim() || 'main',
    message: ghMessage.value.trim() || 'Atherforge commit',
    content: ghContent.value
  };
  if (!payload.owner || !payload.repo || !payload.path) {
    return;
  }
  vscode.postMessage({ type: 'githubCommit', payload });
});

refreshTree.addEventListener('click', () => {
  vscode.postMessage({ type: 'listWorkspace' });
});

repoFetch.addEventListener('click', () => {
  const payload = {
    owner: repoOwner.value.trim(),
    repo: repoName.value.trim(),
    branch: repoBranch.value.trim() || 'main',
    path: repoPath.value.trim()
  };
  if (!payload.owner || !payload.repo) {
    return;
  }
  vscode.postMessage({ type: 'listRepo', payload });
});

repoBranches.addEventListener('click', () => {
  const payload = {
    owner: repoOwner.value.trim(),
    repo: repoName.value.trim()
  };
  if (!payload.owner || !payload.repo) {
    return;
  }
  vscode.postMessage({ type: 'listRepoBranches', payload });
});

repoOpen.addEventListener('click', () => {
  const payload = {
    owner: repoOwner.value.trim(),
    repo: repoName.value.trim(),
    branch: repoBranch.value.trim() || 'main',
    path: repoFilePath.value.trim() || repoPath.value.trim()
  };
  if (!payload.owner || !payload.repo || !payload.path) {
    return;
  }
  vscode.postMessage({ type: 'getRepoFile', payload });
});

repoCommit.addEventListener('click', () => {
  const payload = {
    owner: repoOwner.value.trim(),
    repo: repoName.value.trim(),
    path: repoFilePath.value.trim() || repoPath.value.trim(),
    branch: repoBranch.value.trim() || 'main',
    message: repoCommitMessage.value.trim() || 'Atherforge repo commit',
    content: repoFileContent.value
  };
  if (!payload.owner || !payload.repo || !payload.path) {
    return;
  }
  vscode.postMessage({ type: 'githubCommit', payload });
});

suggestFeatures.addEventListener('click', () => {
  vscode.postMessage({ type: 'suggestFeatures' });
});

// Full Access Mode Event Listeners
runTerminal?.addEventListener('click', () => {
  const cmd = terminalCmd?.value?.trim();
  if (cmd) {
    vscode.postMessage({ type: 'runTerminal', cmd });
  }
});

createDir?.addEventListener('click', () => {
  const dirPath = createDirPath?.value?.trim();
  if (dirPath) {
    vscode.postMessage({ type: 'createDirectory', path: dirPath });
  }
});

deleteItem?.addEventListener('click', () => {
  const itemPath = deletePath?.value?.trim();
  if (itemPath && confirm(`Delete "${itemPath}"?`)) {
    vscode.postMessage({ type: 'deleteItem', path: itemPath });
  }
});

listAllFiles?.addEventListener('click', () => {
  const searchPath = listPath?.value?.trim() || '.';
  vscode.postMessage({ type: 'listAllFiles', path: searchPath });
});

runGit?.addEventListener('click', () => {
  const cmd = gitCmd?.value?.trim();
  if (cmd) {
    vscode.postMessage({ type: 'runGitCmd', cmd });
  }
});

runVscode?.addEventListener('click', () => {
  const cmd = vscodeCmd?.value?.trim();
  if (cmd) {
    vscode.postMessage({ type: 'runVscodeCmd', cmd });
  }
});

// Settings Event Listeners
openSettings?.addEventListener('click', () => {
  settingsPanel?.classList.toggle('open');
});

saveSettings?.addEventListener('click', () => {
  const settings = {
    terminalAutoRun: terminalAutoRun?.checked || false,
    terminalShowOutput: terminalShowOutput?.checked || true,
    terminalTimeout: parseInt(terminalTimeout?.value) || 60000,
    autoCreateDirs: autoCreateDirs?.checked || true,
    confirmDelete: confirmDelete?.checked || true,
    useTrash: useTrash?.checked || true,
    autoStartPipeline: autoStartPipeline?.checked || false,
    maxRetries: parseInt(maxRetries?.value) || 10,
    autoRecovery: autoRecovery?.checked || true,
    autoSelectModel: autoSelectModel?.checked || true,
    showModelSuggestions: showModelSuggestions?.checked || false,
    darkMode: darkMode?.checked || true,
    compactMode: compactMode?.checked || false
  };
  localStorage.setItem('atherforge_settings', JSON.stringify(settings));
  vscode.postMessage({ type: 'saveSettings', payload: settings });
  addMessage('model', '✅ Settings saved!');
  settingsPanel?.classList.remove('open');
});

resetSettings?.addEventListener('click', () => {
  const defaultSettings = {
    terminalAutoRun: false,
    terminalShowOutput: true,
    terminalTimeout: 60000,
    autoCreateDirs: true,
    confirmDelete: true,
    useTrash: true,
    autoStartPipeline: false,
    maxRetries: 10,
    autoRecovery: true,
    autoSelectModel: true,
    showModelSuggestions: false,
    darkMode: true,
    compactMode: false
  };
  localStorage.setItem('atherforge_settings', JSON.stringify(defaultSettings));
  applySettings(defaultSettings);
  addMessage('model', '⚙️ Settings reset to defaults!');
});

// Load settings on startup
function loadSettings() {
  try {
    const saved = localStorage.getItem('atherforge_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      applySettings(settings);
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function applySettings(settings) {
  if (terminalAutoRun) terminalAutoRun.checked = settings.terminalAutoRun;
  if (terminalShowOutput) terminalShowOutput.checked = settings.terminalShowOutput;
  if (terminalTimeout) terminalTimeout.value = settings.terminalTimeout;
  if (autoCreateDirs) autoCreateDirs.checked = settings.autoCreateDirs;
  if (confirmDelete) confirmDelete.checked = settings.confirmDelete;
  if (useTrash) useTrash.checked = settings.useTrash;
  if (autoStartPipeline) autoStartPipeline.checked = settings.autoStartPipeline;
  if (maxRetries) maxRetries.value = settings.maxRetries;
  if (autoRecovery) autoRecovery.checked = settings.autoRecovery;
  if (autoSelectModel) autoSelectModel.checked = settings.autoSelectModel;
  if (showModelSuggestions) showModelSuggestions.checked = settings.showModelSuggestions;
  if (darkMode) darkMode.checked = settings.darkMode;
  if (compactMode) compactMode.checked = settings.compactMode;
  
  // Apply dark mode
  if (settings.darkMode) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

// Initialize settings on load
loadSettings();

saveVault.addEventListener('click', () => {
  const payload = {
    frontend: vaultFrontend.value.trim(),
    backend: vaultBackend.value.trim(),
    reasoning: vaultReasoning.value.trim(),
    github: vaultGithub.value.trim()
  };
  vscode.postMessage({ type: 'saveVault', payload });
  vaultFrontend.value = '';
  vaultBackend.value = '';
  vaultReasoning.value = '';
  vaultGithub.value = '';
});

savePreset.addEventListener('click', () => {
  const name = presetName.value.trim();
  if (!name) {
    return;
  }
  vscode.postMessage({ type: 'savePreset', payload: { name, data: getPipelinePayload() } });
});

savePipelinePreset.addEventListener('click', () => {
  const name = presetName.value.trim() || 'Pipeline preset';
  vscode.postMessage({ type: 'savePreset', payload: { name, data: getPipelinePayload() } });
});

loadPreset.addEventListener('click', () => {
  if (!selectedPresetId) {
    return;
  }
  vscode.postMessage({ type: 'loadPreset', payload: { id: selectedPresetId } });
});

refreshHistory.addEventListener('click', () => {
  vscode.postMessage({ type: 'listHistory' });
});

runPipeline.addEventListener('click', () => {
  const payload = getPipelinePayload();
  pipelineState.isRunning = true;
  pipelineState.isPaused = false;
  pipelineState.isContinuous = continuousMode.checked;
  pipelineState.humanInterventionEnabled = humanInterventionToggle.checked;
  pipelineStatus.textContent = 'Running...';
  pipelineLog.innerHTML = '';
  updatePipelineButtons();
  vscode.postMessage({ 
    type: 'runPipeline', 
    payload,
    continuous: pipelineState.isContinuous,
    humanIntervention: pipelineState.humanInterventionEnabled
  });
});

// Pipeline Control Handlers
pausePipeline.addEventListener('click', () => {
  pipelineState.isPaused = true;
  pipelineStatus.textContent = 'Paused';
  updatePipelineButtons();
  vscode.postMessage({ type: 'pausePipeline' });
});

resumePipeline.addEventListener('click', () => {
  pipelineState.isPaused = false;
  pipelineStatus.textContent = 'Running...';
  updatePipelineButtons();
  vscode.postMessage({ type: 'resumePipeline' });
});

stopPipeline.addEventListener('click', () => {
  pipelineState.isRunning = false;
  pipelineState.isPaused = false;
  pipelineState.isContinuous = false;
  pipelineStatus.textContent = 'Stopped';
  updatePipelineButtons();
  vscode.postMessage({ type: 'stopPipeline' });
});

continuousMode.addEventListener('change', () => {
  pipelineState.isContinuous = continuousMode.checked;
});

humanInterventionToggle.addEventListener('change', () => {
  pipelineState.humanInterventionEnabled = humanInterventionToggle.checked;
  humanInterventionPanel.classList.toggle('visible', pipelineState.humanInterventionEnabled && pipelineState.pendingInterventions.length > 0);
});

approveAll.addEventListener('click', () => {
  vscode.postMessage({ type: 'approveInterventions', approve: true });
  pipelineState.pendingInterventions = [];
  updateInterventionPanel();
});

rejectAll.addEventListener('click', () => {
  vscode.postMessage({ type: 'approveInterventions', approve: false });
  pipelineState.pendingInterventions = [];
  updateInterventionPanel();
});

function updatePipelineButtons() {
  runPipeline.disabled = pipelineState.isRunning;
  pausePipeline.disabled = !pipelineState.isRunning || pipelineState.isPaused;
  resumePipeline.disabled = !pipelineState.isRunning || !pipelineState.isPaused;
  stopPipeline.disabled = !pipelineState.isRunning;
}

function updateInterventionPanel() {
  interventionCount.textContent = pipelineState.pendingInterventions.length;
  interventionQueue.innerHTML = '';
  
  pipelineState.pendingInterventions.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'intervention-item';
    div.innerHTML = `
      <div class="intervention-node">${item.nodeType} - ${item.nodeId}</div>
      <div class="intervention-desc">${item.description}</div>
      <div class="intervention-actions">
        <button class="approve" data-index="${index}">Approve</button>
        <button class="reject" data-index="${index}">Reject</button>
      </div>
    `;
    
    div.querySelector('.approve').addEventListener('click', () => {
      vscode.postMessage({ type: 'respondIntervention', nodeId: item.nodeId, approved: true });
      pipelineState.pendingInterventions.splice(index, 1);
      updateInterventionPanel();
    });
    
    div.querySelector('.reject').addEventListener('click', () => {
      vscode.postMessage({ type: 'respondIntervention', nodeId: item.nodeId, approved: false });
      pipelineState.pendingInterventions.splice(index, 1);
      updateInterventionPanel();
    });
    
    interventionQueue.appendChild(div);
  });
  
  humanInterventionPanel.classList.toggle('visible', pipelineState.humanInterventionEnabled && pipelineState.pendingInterventions.length > 0);
}

modeButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    modeButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    panelEls.forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.panel === button.dataset.mode);
    });
    const offset = index === 0 ? 0 : 70;
    modeGlow.style.transform = `translateX(${offset}px)`;
  });
});

const canvas = document.getElementById('canvas');
const edgeLayer = document.getElementById('edgeLayer');
const addButtons = document.querySelectorAll('.node-add');

const nodes = new Map();
const edges = [];
let dragNode = null;
let dragOffset = { x: 0, y: 0 };
let pendingConnection = null;

function createNode(type) {
  const id = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const node = document.createElement('div');
  node.className = 'node';
  node.dataset.id = id;
  node.dataset.type = type;
  node.style.left = '40px';
  node.style.top = `${40 + nodes.size * 30}px`;

  node.innerHTML = getNodeInnerHtml(type);

  node.addEventListener('mousedown', (event) => {
    if (event.target.classList.contains('port')) {
      return;
    }
    dragNode = node;
    const rect = node.getBoundingClientRect();
    dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });

  node.addEventListener('mouseup', () => {
    dragNode = null;
  });

  node.querySelectorAll('.port').forEach((port) => {
    port.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      if (port.classList.contains('output')) {
        pendingConnection = { from: id };
      }
    });

    port.addEventListener('mouseup', (event) => {
      event.stopPropagation();
      if (pendingConnection && port.classList.contains('input')) {
        edges.push({ from: pendingConnection.from, to: id });
        pendingConnection = null;
        redrawEdges();
      }
    });
  });

  canvas.appendChild(node);
  nodes.set(id, node);
  redrawEdges();
}

function getNodeInnerHtml(type) {
  const title = type.replace(/\b\w/g, (ch) => ch.toUpperCase());
  const base = `
    <div class="node-title">${title}</div>
    <div class="node-io">
      <div class="port input" data-port="input"></div>
      <div class="port output" data-port="output"></div>
    </div>
  `;

  if (type === 'file-read') {
    return `${base}
      <input data-field="filePath" placeholder="path/to/file" />
    `;
  }

  if (type === 'file-write') {
    return `${base}
      <input data-field="filePath" placeholder="path/to/file" />
      <textarea data-field="fileContent" rows="3" placeholder="Content (optional)"></textarea>
    `;
  }

  if (type === 'github-commit') {
    return `${base}
      <input data-field="owner" placeholder="owner" />
      <input data-field="repo" placeholder="repo" />
      <input data-field="filePath" placeholder="path/to/file" />
      <input data-field="branch" placeholder="main" />
      <input data-field="message" placeholder="commit message" />
      <textarea data-field="fileContent" rows="3" placeholder="Content (optional)"></textarea>
    `;
  }

  if (type === 'git-push') {
    return `${base}
      <input data-field="remote" placeholder="origin" />
      <input data-field="branch" placeholder="main" />
    `;
  }

  if (type === 'lint') {
    return `${base}
      <input data-field="command" value="npm run lint" />
    `;
  }

  if (type === 'test') {
    return `${base}
      <input data-field="command" value="npm test" />
    `;
  }

  return `${base}
    <textarea rows="3" placeholder="Node prompt..."></textarea>
  `;
}

function redrawEdges() {
  edgeLayer.innerHTML = '';
  edges.forEach((edge) => {
    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    if (!fromNode || !toNode) {
      return;
    }
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const startX = fromRect.right - canvasRect.left - 10;
    const startY = fromRect.top - canvasRect.top + fromRect.height / 2;
    const endX = toRect.left - canvasRect.left + 10;
    const endY = toRect.top - canvasRect.top + toRect.height / 2;
    const midX = (startX + endX) / 2;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`);
    path.setAttribute('stroke', '#1f3b4d');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.dataset.from = edge.from;
    path.dataset.to = edge.to;
    edgeLayer.appendChild(path);
  });
}

function getPipelinePayload() {
  const serializedNodes = Array.from(nodes.entries()).map(([id, node]) => {
    const type = node.dataset.type;
    const payload = {
      id,
      type,
      prompt: node.querySelector('textarea')?.value || '',
      filePath: node.querySelector('[data-field="filePath"]')?.value || '',
      fileContent: node.querySelector('[data-field="fileContent"]')?.value || '',
      owner: node.querySelector('[data-field="owner"]')?.value || '',
      repo: node.querySelector('[data-field="repo"]')?.value || '',
      branch: node.querySelector('[data-field="branch"]')?.value || '',
      remote: node.querySelector('[data-field="remote"]')?.value || '',
      message: node.querySelector('[data-field="message"]')?.value || '',
      command: node.querySelector('[data-field="command"]')?.value || '',
      x: parseFloat(node.style.left || '0'),
      y: parseFloat(node.style.top || '0')
    };
    return payload;
  });

  return {
    nodes: serializedNodes,
    edges: edges.slice(),
    autoRoute: Boolean(autoRoute?.checked)
  };
}

addButtons.forEach((button) => {
  button.addEventListener('click', () => createNode(button.dataset.node));
});

document.addEventListener('mousemove', (event) => {
  if (!dragNode) {
    return;
  }
  const canvasRect = canvas.getBoundingClientRect();
  const nextX = event.clientX - canvasRect.left - dragOffset.x;
  const nextY = event.clientY - canvasRect.top - dragOffset.y;
  dragNode.style.left = `${Math.max(0, nextX)}px`;
  dragNode.style.top = `${Math.max(0, nextY)}px`;
  redrawEdges();
});

window.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  if (type === 'modelResponse') {
    const modelId = payload.model || activeModel;
    if (payload.stream) {
      startStreamingMessage(modelId, payload.text || '');
    } else {
      addMessage('model', payload.text || 'No response', modelId);
    }
  }
  if (type === 'fileRead') {
    addMessage('model', payload.content || 'File was empty.');
  }
  if (type === 'fileWritten') {
    addMessage('model', payload.message || 'File saved.');
  }
  if (type === 'githubCommit') {
    addMessage('model', payload.message || 'GitHub API response received.');
  }
  if (type === 'error') {
    addMessage('model', payload.message || 'Something went wrong.');
  }
  if (type === 'newChat') {
    sessions[activeModel] = [];
    renderChat();
  }
  if (type === 'repoList') {
    renderRepoList(payload.entries || []);
  }
  if (type === 'repoBranches') {
    renderRepoBranches(payload.entries || []);
  }
  if (type === 'repoFile') {
    repoFilePath.value = payload.path || '';
    repoFileContent.value = payload.content || '';
  }
  if (type === 'featureIdeas') {
    renderSuggestions(payload.items || []);
  }
  if (type === 'presetList') {
    renderPresetList(payload.items || []);
  }
  if (type === 'presetLoaded') {
    loadPipelineFromPreset(payload.data);
  }
  if (type === 'historyList') {
    renderHistory(payload.items || []);
  }
  if (type === 'diffUpdate') {
    renderDiff(payload.text || '');
  }
  if (type === 'vaultSaved') {
    addMessage('model', payload.message || 'Vault updated.');
  }
  // Full Access Mode Responses
  if (type === 'terminalOutput') {
    if (payload.error) {
      terminalOutput.innerHTML = `<span class="error">${payload.error}</span>`;
    } else {
      terminalOutput.textContent = payload.output || 'Command executed successfully.';
    }
  }
  if (type === 'dirCreated') {
    if (payload.error) {
      addMessage('model', `Error: ${payload.error}`);
    } else {
      addMessage('model', `✅ Directory created: ${payload.path}`);
    }
  }
  if (type === 'itemDeleted') {
    if (payload.error) {
      addMessage('model', `Error: ${payload.error}`);
    } else {
      addMessage('model', `✅ Deleted: ${payload.path}`);
    }
  }
  if (type === 'allFilesList') {
    if (payload.error) {
      allFilesList.innerHTML = `<span class="error">${payload.error}</span>`;
    } else {
      allFilesList.innerHTML = (payload.files || []).map(f => `<div class="file-item">${f}</div>`).join('');
    }
  }
  if (type === 'gitOutput') {
    if (payload.error) {
      gitOutput.innerHTML = `<span class="error">${payload.error}</span>`;
    } else {
      gitOutput.textContent = payload.output || 'Git command executed.';
    }
  }
  if (type === 'vscodeCmdDone') {
    if (payload.error) {
      addMessage('model', `Error: ${payload.error}`);
    } else {
      addMessage('model', `✅ VS Code command executed: ${payload.cmd}`);
    }
  }
  if (type === 'pipelineStep') {
    const { nodeId, text } = payload;
    appendPipelineLog(text || 'Pipeline step completed.');
    
    // Apply animation to the executing node
    if (nodeId) {
      const node = nodes.get(nodeId);
      if (node) {
        node.classList.add('node-executing');
        
        // Animate outgoing edges
        const outgoingEdges = Array.from(edgeLayer.querySelectorAll(`[data-from="${nodeId}"]`));
        outgoingEdges.forEach(edge => {
          edge.classList.add('edge-flowing');
        });
        
        // Remove animation after a delay
        setTimeout(() => {
          node.classList.remove('node-executing');
          outgoingEdges.forEach(edge => {
            edge.classList.remove('edge-flowing');
          });
        }, 1200);
      }
    }
  }
  if (type === 'pipelineDone') {
    pipelineStatus.textContent = payload.status || 'Done';
    appendPipelineLog(payload.text || 'Pipeline finished.');
    
    // Reset pipeline state for next run
    if (!pipelineState.isContinuous) {
      pipelineState.isRunning = false;
      pipelineState.isPaused = false;
    }
    updatePipelineButtons();
    
    // If continuous mode is enabled and pipeline completed, restart
    if (pipelineState.isContinuous && pipelineState.isRunning) {
      appendPipelineLog('Continuous mode: Restarting pipeline...');
      setTimeout(() => {
        const newPayload = getPipelinePayload();
        vscode.postMessage({ 
          type: 'runPipeline', 
          payload: newPayload,
          continuous: pipelineState.isContinuous,
          humanIntervention: pipelineState.humanInterventionEnabled
        });
      }, 1000);
    }
  }
  
  // Human Intervention Messages
  if (type === 'pipelinePaused') {
    pipelineState.isPaused = true;
    pipelineStatus.textContent = 'Paused - Waiting for human intervention';
    updatePipelineButtons();
  }
  
  if (type === 'humanInterventionRequired') {
    const { nodeId, nodeType, description } = payload;
    pipelineState.pendingInterventions.push({ nodeId, nodeType, description });
    updateInterventionPanel();
    appendPipelineLog(`Human intervention required: ${nodeType}`);
  }
  
  if (type === 'interventionResponse') {
    const { nodeId, approved } = payload;
    appendPipelineLog(`Human decision for ${nodeId}: ${approved ? 'Approved' : 'Rejected'}`);
  }
  
  if (type === 'pipelineStopped') {
    pipelineState.isRunning = false;
    pipelineState.isPaused = false;
    pipelineState.isContinuous = false;
    pipelineStatus.textContent = 'Stopped';
    updatePipelineButtons();
    appendPipelineLog('Pipeline stopped by user.');
  }
});

vscode.postMessage({ type: 'ready' });

function renderFileTree(entries) {
  fileTree.innerHTML = '';
  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'tool-item';
    item.innerHTML = `<span>${entry.path}</span><span class="badge">${entry.type}</span>`;
    item.addEventListener('click', () => {
      if (entry.type === 'file') {
        readPath.value = entry.path;
        vscode.postMessage({ type: 'readFile', path: entry.path });
      }
    });
    fileTree.appendChild(item);
  });
}

function renderRepoList(entries) {
  repoList.innerHTML = '';
  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'tool-item';
    item.innerHTML = `<span>${entry.path}</span><span class="badge">${entry.type}</span>`;
    item.addEventListener('click', () => {
      repoFilePath.value = entry.path;
    });
    repoList.appendChild(item);
  });
}

function renderRepoBranches(entries) {
  repoList.innerHTML = '';
  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'tool-item';
    item.innerHTML = `<span>${entry}</span><span class="badge">branch</span>`;
    item.addEventListener('click', () => {
      repoBranch.value = entry;
    });
    repoList.appendChild(item);
  });
}

function renderSuggestions(items) {
  suggestionsList.innerHTML = '';
  items.forEach((text) => {
    const item = document.createElement('div');
    item.className = 'tool-item';
    item.textContent = text;
    suggestionsList.appendChild(item);
  });
}

function renderPresetList(items) {
  presetList.innerHTML = '';
  items.forEach((preset) => {
    const item = document.createElement('div');
    item.className = 'tool-item';
    item.innerHTML = `<span>${preset.name}</span><span class="badge">${preset.updatedAt}</span>`;
    item.addEventListener('click', () => {
      selectedPresetId = preset.id;
      presetName.value = preset.name;
    });
    presetList.appendChild(item);
  });
}

function renderHistory(items) {
  historyList.innerHTML = '';
  items.forEach((run) => {
    const item = document.createElement('div');
    item.className = 'tool-item';
    item.innerHTML = `<span>${run.startedAt}</span><span class="badge">${run.status}</span>`;
    historyList.appendChild(item);
  });
}

function renderDiff(text) {
  diffViewer.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'tool-item mono';
  item.textContent = text || 'No diff available.';
  diffViewer.appendChild(item);
}

function appendPipelineLog(text) {
  const item = document.createElement('div');
  item.className = 'tool-item';
  item.textContent = text;
  pipelineLog.appendChild(item);
  pipelineLog.scrollTop = pipelineLog.scrollHeight;
}

function startStreamingMessage(modelId, text) {
  const entry = { role: 'model', content: '' };
  sessions[modelId].push(entry);
  if (modelId === activeModel) {
    renderChat();
  }

  let index = 0;
  const tick = () => {
    entry.content += text.charAt(index);
    index += 1;
    if (modelId === activeModel) {
      renderChat();
    }
    if (index < text.length) {
      requestAnimationFrame(tick);
    }
  };
  tick();
}

function loadPipelineFromPreset(data) {
  nodes.clear();
  edges.length = 0;
  canvas.innerHTML = '';
  edgeLayer.innerHTML = '';
  if (!data) {
    return;
  }
  const incomingNodes = data.nodes || [];
  const incomingEdges = data.edges || [];
  incomingNodes.forEach((nodeData) => {
    createNode(nodeData.type || 'frontend');
    const node = canvas.lastElementChild;
    if (!node) {
      return;
    }
    const existingId = node.dataset.id;
    const nextId = nodeData.id || node.dataset.id;
    node.dataset.id = nextId;
    node.dataset.type = nodeData.type || node.dataset.type;
    node.style.left = `${nodeData.x || 0}px`;
    node.style.top = `${nodeData.y || 0}px`;
    const prompt = node.querySelector('textarea');
    if (prompt && nodeData.prompt) {
      prompt.value = nodeData.prompt;
    }
    const fieldMap = {
      filePath: nodeData.filePath,
      fileContent: nodeData.fileContent,
      owner: nodeData.owner,
      repo: nodeData.repo,
      branch: nodeData.branch,
      remote: nodeData.remote,
      message: nodeData.message,
      command: nodeData.command
    };
    Object.keys(fieldMap).forEach((key) => {
      const input = node.querySelector(`[data-field="${key}"]`);
      if (input && fieldMap[key]) {
        input.value = fieldMap[key];
      }
    });
    if (existingId !== nextId) {
      nodes.delete(existingId);
    }
    nodes.set(node.dataset.id, node);
  });
  incomingEdges.forEach((edge) => edges.push(edge));
  redrawEdges();
}
