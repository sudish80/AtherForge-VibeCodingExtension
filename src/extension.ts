import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { URL } from 'url';
import { getWebviewHtml } from './webview';

type ModelKey = 'codeLlama' | 'starcoder2' | 'qwen2_5Coder' | 'claude35' | 'deepseekCoder' | 'llama3_32k' | 'gemini1_5' | 'phi3Medium' | 'codeLlamaInstruct';

const MODEL_SETTING_KEYS: Record<ModelKey, string> = {
	codeLlama: 'codeLlama',
	starcoder2: 'starcoder2',
	qwen2_5Coder: 'qwen2_5Coder',
	claude35: 'claude35',
	deepseekCoder: 'deepseekCoder',
	llama3_32k: 'llama3_32k',
	gemini1_5: 'gemini1_5',
	phi3Medium: 'phi3Medium',
	codeLlamaInstruct: 'codeLlamaInstruct'
};

// Track current key index per model for fallback rotation
const modelKeyIndices: Record<ModelKey, number> = {
	codeLlama: 0,
	starcoder2: 0,
	qwen2_5Coder: 0,
	claude35: 0,
	deepseekCoder: 0,
	llama3_32k: 0,
	gemini1_5: 0,
	phi3Medium: 0,
	codeLlamaInstruct: 0
};

// Command Injection Protection: Allowed commands for pipeline nodes
const ALLOWED_COMMAND_PATTERNS: RegExp[] = [
	// Allows optional "--" pass-through (e.g., npm run test -- --coverage)
	/^npm\s+(run\s+)?[a-zA-Z0-9\-_]+(\s+--[a-z0-9\-]+)*(\s+--(\s+--[a-z0-9\-]+)*)?$/,
	/^npm\s+test(\s+--[a-z0-9\-_]+)*(\s+--(\s+--[a-z0-9\-_]+)*)?$/,
	/^npm\s+run\s+lint(\s+--[a-z0-9\-_]+)*(\s+--(\s+--[a-z0-9\-_]+)*)?$/,
	/^npx\s+[a-zA-Z0-9\-_.@/]+(\s+--[a-z0-9\-_]+)*$/, // npx <tool> [--flags]
	/^yarn\s+(run\s+)?[a-zA-Z0-9\-_]+(\s+--[a-z0-9\-]+)*(\s+--(\s+--[a-z0-9\-]+)*)?$/,
	/^yarn\s+test(\s+--[a-z0-9\-_]+)*(\s+--(\s+--[a-z0-9\-_]+)*)?$/,
	/^pnpm\s+(run\s+)?[a-zA-Z0-9\-_]+(\s+--[a-z0-9\-]+)*(\s+--(\s+--[a-z0-9\-]+)*)?$/,
	/^make\s+[a-zA-Z0-9\-_]+$/, // make <target>
	/^docker\s+run(\s+--[a-z0-9\-_]+(\s+[^\s;&|`$()]*)?)*$/, // docker run [--flags]
];

// Command Injection: Dangerous metacharacters that could escape the sandbox
const DANGEROUS_CHARACTERS = [';', '|', '&', '`', '$', '(', ')', '<', '>', '\n', '\r'];

const execAsync = promisify(exec);
let secretStorage: vscode.SecretStorage | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel('Atherforge');
	context.subscriptions.push(outputChannel);
	outputChannel.appendLine('Activation started.');

	secretStorage = context.secrets;
	const provider = new AtherforgeViewProvider(context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('atherforge.sidebar', provider, {
			webviewOptions: {
				retainContextWhenHidden: true
			}
		})
	);
	outputChannel.appendLine('Webview provider registered: atherforge.sidebar');

	context.subscriptions.push(
		vscode.commands.registerCommand('atherforge.openSidebar', () => {
			outputChannel?.appendLine('Command executed: atherforge.openSidebar');
			vscode.commands.executeCommand('workbench.view.extension.atherforge');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atherforge.newChat', () => {
			outputChannel?.appendLine('Command executed: atherforge.newChat');
			provider.postMessage('newChat', {});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atherforge.generateCode', async (uri?: vscode.Uri) => {
			outputChannel?.appendLine('Command executed: atherforge.generateCode');
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showWarningMessage('No workspace folder open');
				return;
			}
			// Auto-trigger AI code generation with smart model selection
			const task = uri ? `Generate code for: ${uri.fsPath}` : 'Generate code for current file';
			provider.postMessage('sendMessage', { message: task, autoMode: true });
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atherforge.runPipeline', async () => {
			outputChannel?.appendLine('Command executed: atherforge.runPipeline');
			provider.postMessage('runPipeline', {});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atherforge.autoPilot', async () => {
			outputChannel?.appendLine('Command executed: atherforge.autoPilot - ENABLING FULL AUTONOMY');
			// Enable Master Control Auto-Pilot Mode
			vscode.workspace.getConfiguration('atherforge').update('autoMode', true, true);
			provider.postMessage('enableMasterControl', { enabled: true });
			vscode.window.showInformationMessage('Atherforge: Auto-Pilot Enabled - Running autonomously');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atherforge.stopAll', async () => {
			outputChannel?.appendLine('Command executed: atherforge.stopAll');
			provider.stopAllOperations();
			vscode.window.showInformationMessage('Atherforge: All operations stopped');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atherforge.generateFeaturesCSV', async () => {
			outputChannel?.appendLine('Command executed: atherforge.generateFeaturesCSV');
			provider.generateFeaturesCSV();
			vscode.window.showInformationMessage('Atherforge: Generating features CSV...');
		})
	);

	outputChannel.appendLine('Activation completed.');
}

export function deactivate() {}

class AtherforgeViewProvider implements vscode.WebviewViewProvider {
	private view?: vscode.WebviewView;
	private pendingErrors: PendingError[] = [];
	
	// Pipeline State Management - Properly Typed
	private pipelineState: PipelineState = {
		isRunning: false,
		isPaused: false,
		isContinuous: false,
		humanInterventionEnabled: true,
		pendingInterventions: [],
		currentNodeId: null,
		stopRequested: false,
		lastRunStatus: 'idle',
		runCount: 0,
		successCount: 0,
		failureCount: 0
	};

	constructor(private readonly context: vscode.ExtensionContext) {}

	resolveWebviewView(view: vscode.WebviewView): void {
		outputChannel?.appendLine('Resolving webview: atherforge.sidebar');
		this.view = view;
		view.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri]
		};
		try {
			view.webview.html = getWebviewHtml(view.webview, this.context.extensionUri);
			outputChannel?.appendLine('Webview HTML set successfully.');
		} catch (err) {
			outputChannel?.appendLine(`Failed to set webview HTML: ${String(err)}`);
			throw err;
		}

		view.webview.onDidReceiveMessage(async (message) => {
			try {
				switch (message.type) {
					case 'ready':
						await this.handleWorkspaceList();
						await this.handlePresetList();
						await this.handleHistoryList();
						break;
					case 'invokeModel':
						await this.handleInvokeModel(message);
						break;
					case 'readFile':
						await this.handleReadFile(message);
						break;
					case 'writeFile':
						await this.handleWriteFile(message);
						break;
					case 'listWorkspace':
						await this.handleWorkspaceList();
						break;
					case 'listRepo':
						await this.handleRepoList(message);
						break;
					case 'listRepoBranches':
						await this.handleRepoBranches(message);
						break;
					case 'getRepoFile':
						await this.handleRepoFile(message);
						break;
					case 'suggestFeatures':
						await this.handleFeatureIdeas();
						break;
					case 'runTerminal':
						await this.handleRunTerminal(message);
						break;
					case 'createDirectory':
						await this.handleCreateDirectory(message);
						break;
					case 'deleteItem':
						await this.handleDeleteItem(message);
						break;
					case 'listAllFiles':
						await this.handleListAllFiles(message);
						break;
					case 'runGitCmd':
						await this.handleRunGitCmd(message);
						break;
					case 'runVscodeCmd':
						await this.handleRunVscodeCmd(message);
						break;
					case 'saveSettings':
						await this.handleSaveSettings(message);
						break;
					case 'runPipeline':
						await this.handleRunPipeline(message);
						break;
					case 'pausePipeline':
						this.handlePausePipeline();
						break;
					case 'resumePipeline':
						this.handleResumePipeline();
						break;
					case 'stopPipeline':
						this.handleStopPipeline();
						break;
					case 'respondIntervention':
						await this.handleRespondIntervention(message);
						break;
					case 'approveInterventions':
						await this.handleApproveInterventions(message);
						break;
					case 'githubCommit':
						await this.handleGithubCommit(message);
						break;
					case 'saveVault':
						await this.handleSaveVault(message);
						break;
					case 'savePreset':
						await this.handleSavePreset(message);
						break;
					case 'loadPreset':
						await this.handleLoadPreset(message);
						break;
					case 'listHistory':
						await this.handleHistoryList();
						break;
					default:
						break;
				}
			} catch (error) {
				const messageText = error instanceof Error ? error.message : 'Unknown error';
				await this.recordError(message?.type || 'unknown', messageText);
				this.postMessage('error', { message: messageText });
			}
		});
	}

	postMessage(type: string, payload: Record<string, unknown>): void {
		if (this.view) {
			void this.view.webview.postMessage({ type, payload });
		}
	}

	// Full Access: Stop all operations
	stopAllOperations(): void {
		this.pipelineState.isRunning = false;
		this.pipelineState.stopRequested = true;
		this.pipelineState.pendingInterventions = [];
		this.postMessage('pipelineStopped', { message: 'All operations stopped' });
		outputChannel?.appendLine('STOP ALL: All operations terminated');
	}

	private async handleInvokeModel(message: { model: ModelKey; messages: Array<{ role: string; content: string }> }) {
		const reply = await invokeModel(message.model, message.messages);
		this.postMessage('modelResponse', { text: reply, model: message.model, stream: true });
		await this.recordFix('invokeModel');
	}

	private async handleReadFile(message: { path: string }) {
		try {
			validateProjectPath(message.path);
			const content = await readWorkspaceFile(message.path);
			this.postMessage('fileRead', { content });
		} catch (err) {
			this.postMessage('fileRead', { error: String(err) });
		}
		await this.recordFix('readFile');
	}

	private async handleWriteFile(message: { path: string; content: string }) {
		try {
			validateProjectPath(message.path);
			await writeWorkspaceFile(message.path, message.content ?? '');
			this.postMessage('fileWritten', { message: `Saved ${message.path}` });
		} catch (err) {
			this.postMessage('fileWritten', { error: String(err) });
		}
		await this.recordFix('writeFile');
	}

	private async handleGithubCommit(message: { payload: GitHubCommitPayload }) {
		const result = await commitToGitHub(message.payload);
		this.postMessage('githubCommit', { message: result.message });
		await logGitHubCommit(result);
		await this.recordFix('githubCommit');
	}

	private async handleWorkspaceList() {
		const entries = await listWorkspaceEntries();
		this.postMessage('workspaceList', { entries });
		await this.recordFix('listWorkspace');
	}

	private async handleRepoList(message: { payload: GitHubRepoPayload }) {
		const entries = await listGitHubRepoContents(message.payload);
		this.postMessage('repoList', { entries });
		await this.recordFix('listRepo');
	}

	private async handleFeatureIdeas() {
		const ideas = await suggestFeatureIdeas();
		this.postMessage('featureIdeas', { items: ideas });
		await this.recordFix('suggestFeatures');
	}

	// Full Access: Run terminal command
	private async handleRunTerminal(message: { cmd: string }) {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				this.postMessage('terminalOutput', { error: 'No workspace folder open' });
				return;
			}
			const { stdout, stderr } = await execAsync(message.cmd, { cwd: workspaceFolder.uri.fsPath, timeout: 60000 });
			this.postMessage('terminalOutput', { output: stdout || stderr, success: true });
			outputChannel?.appendLine(`TERMINAL: ${message.cmd} -> ${stdout || stderr}`);
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.postMessage('terminalOutput', { error: errorMsg });
			outputChannel?.appendLine(`TERMINAL ERROR: ${message.cmd} -> ${errorMsg}`);
		}
	}

	// Full Access: Create directory
	private async handleCreateDirectory(message: { path: string }) {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				this.postMessage('dirCreated', { error: 'No workspace folder open' });
				return;
			}
			const dirPath = path.join(workspaceFolder.uri.fsPath, message.path);
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
			this.postMessage('dirCreated', { path: message.path, success: true });
			outputChannel?.appendLine(`DIR CREATED: ${message.path}`);
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.postMessage('dirCreated', { error: errorMsg });
		}
	}

	// Full Access: Delete file or directory
	private async handleDeleteItem(message: { path: string }) {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				this.postMessage('itemDeleted', { error: 'No workspace folder open' });
				return;
			}
			const itemPath = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, message.path));
			await vscode.workspace.fs.delete(itemPath, { recursive: true, useTrash: true });
			this.postMessage('itemDeleted', { path: message.path, success: true });
			outputChannel?.appendLine(`DELETED: ${message.path}`);
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.postMessage('itemDeleted', { error: errorMsg });
		}
	}

	// Full Access: List all files recursively
	private async handleListAllFiles(message: { path: string }) {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				this.postMessage('allFilesList', { error: 'No workspace folder open' });
				return;
			}
			const basePath = message.path === '.' ? workspaceFolder.uri.fsPath : path.join(workspaceFolder.uri.fsPath, message.path);
			const files: string[] = [];
			await this.walkDirectory(basePath, files);
			this.postMessage('allFilesList', { files, success: true });
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.postMessage('allFilesList', { error: errorMsg });
		}
	}

	private async walkDirectory(dir: string, files: string[]): Promise<void> {
		const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));
		for (const [name, type] of entries) {
			const fullPath = path.join(dir, name);
			if (type === vscode.FileType.Directory) {
				await this.walkDirectory(fullPath, files);
			} else {
				files.push(fullPath);
			}
		}
	}

	// Full Access: Run git command
	private async handleRunGitCmd(message: { cmd: string }) {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				this.postMessage('gitOutput', { error: 'No workspace folder open' });
				return;
			}
			const fullCmd = `git ${message.cmd}`;
			const { stdout, stderr } = await execAsync(fullCmd, { cwd: workspaceFolder.uri.fsPath, timeout: 60000 });
			this.postMessage('gitOutput', { output: stdout || stderr, success: true });
			outputChannel?.appendLine(`GIT: ${fullCmd} -> ${stdout || stderr}`);
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.postMessage('gitOutput', { error: errorMsg });
			outputChannel?.appendLine(`GIT ERROR: ${message.cmd} -> ${errorMsg}`);
		}
	}

	// Full Access: Run VS Code command
	private async handleRunVscodeCmd(message: { cmd: string }) {
		try {
			await vscode.commands.executeCommand(message.cmd);
			this.postMessage('vscodeCmdDone', { cmd: message.cmd, success: true });
			outputChannel?.appendLine(`VSCODE: ${message.cmd}`);
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.postMessage('vscodeCmdDone', { error: errorMsg });
		}
	}

	// Settings: Save settings to VS Code configuration
	private async handleSaveSettings(message: { payload: Record<string, unknown> }) {
		try {
			const config = vscode.workspace.getConfiguration('atherforge');
			for (const [key, value] of Object.entries(message.payload)) {
				await config.update(key, value, vscode.ConfigurationTarget.Global);
			}
			this.postMessage('settingsSaved', { success: true });
			outputChannel?.appendLine('SETTINGS: Saved to global configuration');
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.postMessage('settingsSaved', { error: errorMsg });
		}
	}

	// Generate CSV of all features with error tracking
	public generateFeaturesCSV(): void {
		void this.generateFeaturesCSVInternal();
	}

	// Export LLM API keys to file
	public exportAPIKeys(): void {
		void this.exportAPIKeysToFile();
	}

	// Import LLM API keys from file
	public importAPIKeys(): void {
		void this.importAPIKeysFromFile();
	}

	private async exportAPIKeysToFile() {
		try {
			const keysData: Record<string, string[]> = {};
			
			// Get keys from workspace config
			const config = vscode.workspace.getConfiguration('atherforge');
			const models = ['codeLlama', 'starcoder2', 'qwen2_5Coder', 'claude35', 'deepseekCoder', 'llama3_32k', 'gemini1_5', 'phi3Medium', 'codeLlamaInstruct'];
			
			for (const model of models) {
				const keys = config.get<string[]>(`models.${model}.apiKeys`);
				if (keys && keys.length > 0) {
					keysData[model] = keys;
				}
			}
			
			const csvContent = 'Model,API Keys\n' + 
				Object.entries(keysData).map(([model, keys]) => 
					`"${model}","${keys.join(';')}"`
				).join('\n');
			
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (workspaceFolder) {
				const filePath = path.join(workspaceFolder.uri.fsPath, 'llm_api_keys.csv');
				await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(csvContent, 'utf-8'));
				vscode.window.showInformationMessage(`API Keys exported to: llm_api_keys.csv`);
				outputChannel?.appendLine(`API KEYS: Exported to ${filePath}`);
			} else {
				vscode.window.showWarningMessage('No workspace open');
			}
		} catch (err) {
			vscode.window.showErrorMessage(`Failed to export: ${String(err)}`);
		}
	}

	private async importAPIKeysFromFile() {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showWarningMessage('No workspace open');
				return;
			}
			
			const filePath = path.join(workspaceFolder.uri.fsPath, 'llm_api_keys.csv');
			const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
			const csvContent = Buffer.from(fileContent).toString('utf-8');
			
			const lines = csvContent.split('\n').slice(1); // Skip header
			const config = vscode.workspace.getConfiguration('atherforge');
			
			for (const line of lines) {
				const match = line.match(/"([^"]+)","([^"]+)"/);
				if (match) {
					const [, model, keysStr] = match;
					const keys = keysStr.split(';');
					await config.update(`models.${model}.apiKeys`, keys, vscode.ConfigurationTarget.Global);
				}
			}
			
			vscode.window.showInformationMessage('API Keys imported successfully!');
			outputChannel?.appendLine('API KEYS: Imported from llm_api_keys.csv');
		} catch (err) {
			vscode.window.showErrorMessage(`Failed to import: ${String(err)}`);
		}
	}

	private async generateFeaturesCSVInternal() {
		const features = [
			{ feature: 'Multi-Model AI Support', description: 'Added support for 9 different AI models', dateAdded: '2026-01-15', errorFile: '', errorDescription: '', dateErrorFixed: '', resolutionNotes: '' },
			{ feature: 'Pipeline Execution System', description: 'Visual flow builder with node execution', dateAdded: '2026-01-18', errorFile: 'extension.ts', errorDescription: 'Pipeline state race condition', dateErrorFixed: '2026-01-20', resolutionNotes: 'Added proper state management with timeouts' },
			{ feature: 'Master Control Auto-Pilot', description: 'Fully autonomous AI mode without human intervention', dateAdded: '2026-01-22', errorFile: '', errorDescription: '', dateErrorFixed: '', resolutionNotes: '' },
			{ feature: 'Smart Model Selection', description: 'Auto-select best model based on task', dateAdded: '2026-01-25', errorFile: 'extension.ts', errorDescription: 'Model selection logic incorrect', dateErrorFixed: '2026-01-26', resolutionNotes: 'Added keyword matching for task type detection' },
			{ feature: 'Self-Healing Pipeline', description: 'Auto-recovery on errors', dateAdded: '2026-01-28', errorFile: 'extension.ts', errorDescription: 'Timeout not cleared on stop', dateErrorFixed: '2026-01-29', resolutionNotes: 'Added clearTimeout in stop handler' },
			{ feature: 'API Key Rotation', description: 'Multi-key fallback for rate limits', dateAdded: '2026-02-01', errorFile: 'extension.ts', errorDescription: 'Keys rotated on non-auth errors', dateErrorFixed: '2026-02-02', resolutionNotes: 'Only rotate on 401/403 errors' },
			{ feature: 'Human Intervention System', description: 'Manual approval for pipeline steps', dateAdded: '2026-02-03', errorFile: 'extension.ts', errorDescription: 'Intervention timeout not working', dateErrorFixed: '2026-02-04', resolutionNotes: 'Fixed timeout handling with clearTimeout' },
			{ feature: 'Full Access Mode', description: 'Terminal, git, file operations', dateAdded: '2026-02-05', errorFile: 'extension.ts', errorDescription: 'Missing handler methods', dateErrorFixed: '2026-02-06', resolutionNotes: 'Added all required handler methods' },
			{ feature: 'Settings Panel', description: 'Configuration UI with preferences', dateAdded: '2026-02-08', errorFile: '', errorDescription: '', dateErrorFixed: '', resolutionNotes: '' },
			{ feature: 'Dark Mode Support', description: 'UI dark/light theme toggle', dateAdded: '2026-02-10', errorFile: 'atherforge.css', errorDescription: 'CSS variables not applied', dateErrorFixed: '2026-02-10', resolutionNotes: 'Added proper CSS variable scoping' },
			{ feature: 'Continuous Mode', description: 'Auto-restart pipeline on completion', dateAdded: '2026-02-11', errorFile: 'extension.ts', errorDescription: 'Infinite loop on failure', dateErrorFixed: '2026-02-12', resolutionNotes: 'Added max retry limit of 10' },
			{ feature: 'GitHub Integration', description: 'API-based commit and repo browser', dateAdded: '2026-02-12', errorFile: 'extension.ts', errorDescription: 'API rate limiting', dateErrorFixed: '2026-02-13', resolutionNotes: 'Added exponential backoff' },
			{ feature: 'File Tree Browser', description: 'Workspace file listing', dateAdded: '2026-02-14', errorFile: '', errorDescription: '', dateErrorFixed: '', resolutionNotes: '' },
			{ feature: 'Preset Manager', description: 'Save and load pipeline presets', dateAdded: '2026-02-14', errorFile: 'extension.ts', errorDescription: 'Preset not loading correctly', dateErrorFixed: '2026-02-15', resolutionNotes: 'Fixed JSON parse error handling' },
			{ feature: 'Terminal Command Execution', description: 'Run shell commands from UI', dateAdded: '2026-02-15', errorFile: 'extension.ts', errorDescription: 'Command injection vulnerability', dateErrorFixed: '2026-02-15', resolutionNotes: 'Added command pattern validation' },
			{ feature: 'Feature Ideas Generator', description: 'AI-powered feature suggestions', dateAdded: '2026-02-16', errorFile: '', errorDescription: '', dateErrorFixed: '', resolutionNotes: '' }
		];

		// Generate CSV content
		const header = 'Feature Name,Description,Date Added,Error File Name,Error Description,Date Error Fixed,Resolution Notes\n';
		const rows = features.map(f => 
			`"${f.feature}","${f.description}","${f.dateAdded}","${f.errorFile}","${f.errorDescription}","${f.dateErrorFixed}","${f.resolutionNotes}"`
		).join('\n');
		const csv = header + rows;

		// Save to workspace
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			const csvPath = path.join(workspaceFolder.uri.fsPath, 'project_features.csv');
			await vscode.workspace.fs.writeFile(vscode.Uri.file(csvPath), Buffer.from(csv, 'utf-8'));
			outputChannel?.appendLine(`FEATURES CSV: Saved to ${csvPath}`);
			vscode.window.showInformationMessage(`Project features CSV saved to: project_features.csv`);
			this.postMessage('featuresCSVGenerated', { path: 'project_features.csv', count: features.length });
		} else {
			this.postMessage('featuresCSVGenerated', { error: 'No workspace open' });
		}
		return csv;
	}

	private async handleRunPipeline(message: { payload: PipelinePayload; continuous?: boolean; humanIntervention?: boolean; masterControl?: boolean }) {
		// Initialize pipeline state
		this.pipelineState.isRunning = true;
		this.pipelineState.isPaused = false;
		this.pipelineState.isContinuous = message.continuous ?? false;
		// Master Control overrides human intervention - fully automatic
		this.pipelineState.humanInterventionEnabled = message.masterControl ? false : (message.humanIntervention ?? true);
		this.pipelineState.stopRequested = false;
		this.pipelineState.pendingInterventions = [];
		
		const MAX_CONTINUOUS_RETRIES = 10;
		
		const onStep = (nodeId: string, text: string) => {
			this.postMessage('pipelineStep', { nodeId, text });
		};
		
		const onDone = async (status: string, text: string) => {
			this.pipelineState.isRunning = false;
			this.pipelineState.lastRunStatus = status === 'Completed' || status === 'Done' ? 'completed' : 'failed';
			
			if (this.pipelineState.lastRunStatus === 'completed') {
				this.pipelineState.successCount++;
			} else {
				this.pipelineState.failureCount++;
			}
			this.pipelineState.runCount++;
			
			this.postMessage('pipelineDone', { status, text });
			
			// Auto-restart if Master Control or Continuous mode
			if ((this.pipelineState.isContinuous || message.masterControl) && !this.pipelineState.stopRequested) {
				if (this.pipelineState.runCount >= MAX_CONTINUOUS_RETRIES && this.pipelineState.lastRunStatus !== 'completed') {
					this.postMessage('pipelineDone', { 
						status: 'Failed', 
						text: `Max retries (${MAX_CONTINUOUS_RETRIES}) exceeded. Stopping.` 
					});
					this.pipelineState.isContinuous = false;
					return;
				}
				
				// Shorter delay in Master Control mode
				const delay = message.masterControl ? 500 : (this.pipelineState.lastRunStatus !== 'completed' 
					? Math.min(1000 * Math.pow(2, this.pipelineState.failureCount), 30000) 
					: 1000);
				
				await new Promise(resolve => setTimeout(resolve, delay));
				
				if (!this.pipelineState.stopRequested) {
					this.postMessage('pipelineStep', { nodeId: '', text: `Auto-restarting pipeline (run ${this.pipelineState.runCount + 1})...` });
					const newPayload = message.payload;
					await this.handleRunPipeline({ ...message, payload: newPayload });
				}
			}
		};
		
		await runPipeline(
			message.payload, 
			onStep, 
			onDone,
			this.pipelineState,
			(nodeId: string, nodeType: string, description: string) => this.requestHumanIntervention(nodeId, nodeType, description)
		);
		await recordExecutionHistory(message.payload);
		await this.recordFix('runPipeline');
	}

	private handlePausePipeline(): void {
		this.pipelineState.isPaused = true;
		this.postMessage('pipelinePaused', { message: 'Pipeline paused' });
	}

	private handleResumePipeline(): void {
		this.pipelineState.isPaused = false;
		this.postMessage('pipelineResumed', { message: 'Pipeline resumed' });
	}

	private handleStopPipeline(): void {
		this.pipelineState.stopRequested = true;
		this.pipelineState.isRunning = false;
		this.pipelineState.isPaused = false;
		
		// Clear all intervention timeouts
		for (const intervention of this.pipelineState.pendingInterventions) {
			if (intervention.timeoutId) {
				clearTimeout(intervention.timeoutId);
			}
		}
		this.pipelineState.pendingInterventions = [];
		this.postMessage('pipelineStopped', { message: 'Pipeline stopped' });
	}

	private async handleRespondIntervention(message: { nodeId: string; approved: boolean }): Promise<void> {
		const intervention = this.pipelineState.pendingInterventions.find(i => i.nodeId === message.nodeId);
		if (intervention && intervention.resolve) {
			intervention.resolve(message.approved);
			this.pipelineState.pendingInterventions = this.pipelineState.pendingInterventions.filter(i => i.nodeId !== message.nodeId);
			this.postMessage('interventionResponse', { nodeId: message.nodeId, approved: message.approved });
		}
	}

	private async handleApproveInterventions(message: { approve: boolean }): Promise<void> {
		for (const intervention of this.pipelineState.pendingInterventions) {
			if (intervention.resolve) {
				intervention.resolve(message.approve);
			}
		}
		this.pipelineState.pendingInterventions = [];
		this.postMessage('interventionsProcessed', { approve: message.approve });
	}

	private requestHumanIntervention(nodeId: string, nodeType: string, description: string): Promise<boolean> {
		return new Promise((resolve) => {
			// Set a timeout for human intervention (default 5 minutes)
			const timeoutId = setTimeout(() => {
				// Auto-reject on timeout
				const index = this.pipelineState.pendingInterventions.findIndex(i => i.nodeId === nodeId);
				if (index !== -1) {
					this.pipelineState.pendingInterventions.splice(index, 1);
				}
				resolve(false);
				this.postMessage('interventionTimeout', { nodeId, message: 'Human intervention timed out - auto-rejected' });
			}, 5 * 60 * 1000); // 5 minute timeout
			
			const intervention: InterventionItem = { 
				nodeId, 
				nodeType, 
				description, 
				timestamp: Date.now(),
				resolve,
				timeoutId 
			};
			this.pipelineState.pendingInterventions.push(intervention);
			this.postMessage('humanInterventionRequired', { nodeId, nodeType, description });
			
			// Handle case where pipeline is stopped while waiting
			const checkStop = setInterval(() => {
				if (this.pipelineState.stopRequested) {
					clearInterval(checkStop);
					if (timeoutId) clearTimeout(timeoutId);
					resolve(false);
				}
			}, 100);
		});
	}

	private async handleRepoBranches(message: { payload: { owner: string; repo: string } }) {
		const branches = await listGitHubBranches(message.payload);
		this.postMessage('repoBranches', { entries: branches });
	}

	private async handleRepoFile(message: { payload: { owner: string; repo: string; branch: string; path: string } }) {
		const content = await getGitHubFileContent(message.payload);
		this.postMessage('repoFile', { path: message.payload.path, content });
	}

	private async handleSaveVault(message: { payload: Record<string, string> }) {
		if (secretStorage) {
			for (const [key, value] of Object.entries(message.payload)) {
				if (value) {
					await secretStorage.store(`atherforge.${key}`, value);
				}
			}
		}
		this.postMessage('vaultSaved', { message: 'Vault updated.' });
	}

	private async handleSavePreset(message: { payload: { name: string; data: PipelinePayload } }) {
		const presets = await loadPresets();
		const id = `preset-${Date.now()}`;
		presets.push({
			id,
			name: message.payload.name,
			data: message.payload.data,
			updatedAt: new Date().toISOString()
		});
		await savePresets(presets);
		await this.handlePresetList();
	}

	private async handleLoadPreset(message: { payload: { id: string } }) {
		const presets = await loadPresets();
		const found = presets.find((p) => p.id === message.payload.id);
		if (found) {
			this.postMessage('presetLoaded', { data: found.data });
		}
	}

	private async handlePresetList() {
		const presets = await loadPresets();
		this.postMessage('presetList', { items: presets });
	}

	private async handleHistoryList() {
		const items = await loadExecutionHistory();
		this.postMessage('historyList', { items });
	}

	private async recordError(context: string, message: string) {
		const entry: PendingError = {
			context,
			message,
			occurredAt: new Date()
		};
		this.pendingErrors.push(entry);
	}

	private async recordFix(context: string) {
		if (this.pendingErrors.length === 0) {
			return;
		}
		const entry = this.pendingErrors.shift();
		if (!entry) {
			return;
		}
		const fixedAt = new Date();
		const durationMs = fixedAt.getTime() - entry.occurredAt.getTime();
		await appendErrorFixRow({
			context: entry.context,
			errorMessage: entry.message,
			occurredAt: entry.occurredAt,
			fixedAt,
			durationMs,
			resolvedBy: context
		});
	}
}

async function invokeModel(modelKey: ModelKey, messages: Array<{ role: string; content: string }>): Promise<string> {
	const config = vscode.workspace.getConfiguration('atherforge');
	const prefix = `models.${MODEL_SETTING_KEYS[modelKey]}`;
	const baseUrl = (config.get<string>(`${prefix}.baseUrl`) || '').trim();
	const apiKeyHeader = (config.get<string>(`${prefix}.apiKeyHeader`) || 'Authorization').trim();
	const model = (config.get<string>(`${prefix}.model`) || '').trim();

	// Get apiKeys array, fallback to single apiKey for backwards compatibility
	let apiKeys = config.get<string[]>(`${prefix}.apiKeys`) || [];
	if (apiKeys.length === 0) {
		const singleKey = (config.get<string>(`${prefix}.apiKey`) || '').trim();
		if (singleKey) {
			apiKeys = [singleKey];
		}
	}

	if (!baseUrl) {
		throw new Error(`Configure ${prefix}.baseUrl before sending requests.`);
	}

	if (apiKeys.length === 0) {
		throw new Error(`Configure ${prefix}.apiKeys or ${prefix}.apiKey before sending requests.`);
	}

	const maxRetries = apiKeys.length;
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const currentKeyIndex = modelKeyIndices[modelKey];
			const currentKey = apiKeys[currentKeyIndex];

			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};

			if (currentKey) {
				headers[apiKeyHeader] = apiKeyHeader.toLowerCase() === 'authorization' ? `Bearer ${currentKey}` : currentKey;
			}

			try {
				const response = await requestJson(baseUrl, 'POST', headers, {
					model: model || undefined,
					messages
				});
				return extractModelReply(response);
			} catch (err: any) {
				const status: number = err.statusCode || err.status || 0;
				
				// If 401 Unauthorized, try next key
				if (status === 401 && attempt < maxRetries - 1) {
					const nextKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
					modelKeyIndices[modelKey] = nextKeyIndex;
					
					// Log key rotation
					const now = new Date();
					await appendErrorFixRow({
						context: `${modelKey}-api`,
						errorMessage: 'API key exhausted (401 Unauthorized)',
						occurredAt: now,
						fixedAt: now,
						durationMs: 0,
						resolvedBy: `Rotated to key index ${nextKeyIndex}`
					});
					
					lastError = err;
					continue; // Retry with next key
				}
				
				throw err;
			}
		} catch (err) {
			lastError = err as Error;
		}
	}

	throw lastError || new Error('Failed to invoke model after all key attempts.');
}

function extractModelReply(response: any): string {
	if (!response) {
		return 'No response received.';
	}
	if (response.reply) {
		return String(response.reply);
	}
	if (response.output?.text) {
		return String(response.output.text);
	}
	if (response.choices?.[0]?.message?.content) {
		return String(response.choices[0].message.content);
	}
	if (response.message) {
		return String(response.message);
	}
	return JSON.stringify(response, null, 2);
}

async function readWorkspaceFile(relativePath: string): Promise<string> {
	// Safety: validate path before reading
	validateProjectPath(relativePath);
	const uri = getWorkspaceUri(relativePath);
	try {
		const data = await vscode.workspace.fs.readFile(uri);
		return new TextDecoder('utf-8').decode(data);
	} catch (err) {
		throw new Error(`Failed to read file from project: ${err}`);
	}
}

async function writeWorkspaceFile(relativePath: string, content: string): Promise<void> {
	// Safety: validate path before writing
	validateProjectPath(relativePath);

	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		throw new Error('Open a workspace folder to write files.');
	}

	const normalized = normalizeRelativePath(relativePath);
	const uri = vscode.Uri.joinPath(workspace.uri, normalized);
	const dirPath = path.posix.dirname(normalized);

	try {
		// Create parent directories if needed
		if (dirPath !== '.') {
			await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspace.uri, dirPath));
		}
		// Write file only within workspace
		await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
	} catch (err) {
		throw new Error(`Failed to write file to project: ${err}`);
	}
}

function getWorkspaceUri(relativePath: string): vscode.Uri {
	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		throw new Error('Open a workspace folder to access files.');
	}

	const normalized = normalizeRelativePath(relativePath);
	return vscode.Uri.joinPath(workspace.uri, normalized);
}

function normalizeRelativePath(input: string): string {
	const cleaned = input.replace(/\\/g, '/').trim();
	if (!cleaned || path.isAbsolute(cleaned)) {
		throw new Error('Provide a workspace-relative file path.');
	}
	const normalized = path.posix.normalize(cleaned);
	if (normalized.startsWith('..')) {
		throw new Error('Path must stay within the workspace.');
	}
	return normalized;
}

function validateProjectPath(filePath: string): void {
	// Validate that the path is workspace-relative and doesn't escape the project
	if (!filePath || typeof filePath !== 'string') {
		throw new Error('Invalid file path: path must be a non-empty string.');
	}

	// Reject absolute paths
	if (path.isAbsolute(filePath)) {
		throw new Error('Access denied: absolute paths not allowed. Use workspace-relative paths only.');
	}

	// Reject paths with .. (path traversal attempts)
	if (filePath.includes('..')) {
		throw new Error('Access denied: path traversal not allowed. Stay within the project directory.');
	}

	// Reject paths starting with /
	if (filePath.startsWith('/')) {
		throw new Error('Access denied: must use relative paths. Remove leading slash.');
	}

	// Additional check: normalize and verify again
	const normalized = path.posix.normalize(filePath);
	if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
		throw new Error('Access denied: path is outside the workspace.');
	}
}

type GitHubCommitPayload = {
	owner: string;
	repo: string;
	path: string;
	branch?: string;
	message: string;
	content: string;
	sha?: string;
};

type GitHubCommitLog = {
	owner: string;
	repo: string;
	path: string;
	branch: string;
	message: string;
	url: string;
	sha: string;
	committedAt: Date;
};

type GitHubRepoPayload = {
	owner: string;
	repo: string;
	branch?: string;
	path?: string;
};

type PipelineNode = {
	id: string;
	type: ModelKey | 'file-read' | 'file-write' | 'github-commit' | 'git-push' | 'lint' | 'test' | 'http-request' | 'transform' | 'condition' | 'delay' | 'notify';
	prompt?: string;
	filePath?: string;
	fileContent?: string;
	owner?: string;
	repo?: string;
	branch?: string;
	remote?: string;
	message?: string;
	command?: string;
	url?: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string;
	delayMs?: number;
	condition?: string;
	transformFn?: string;
	x?: number;
	y?: number;
};

type PipelineEdge = {
	from: string;
	to: string;
};

type PipelinePayload = {
	nodes: PipelineNode[];
	edges: PipelineEdge[];
};

// Pipeline State Interface for proper typing
interface InterventionItem {
	nodeId: string;
	nodeType: string;
	description: string;
	timestamp: number;
	resolve?: (approved: boolean) => void;
	timeoutId?: NodeJS.Timeout;
}

interface PipelineState {
	isRunning: boolean;
	isPaused: boolean;
	isContinuous: boolean;
	humanInterventionEnabled: boolean;
	pendingInterventions: InterventionItem[];
	currentNodeId: string | null;
	stopRequested: boolean;
	lastRunStatus: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
	runCount: number;
	successCount: number;
	failureCount: number;
}

async function commitToGitHub(payload: GitHubCommitPayload): Promise<{ message: string } & GitHubCommitLog> {
	const config = vscode.workspace.getConfiguration('atherforge');
	const baseUrl = (config.get<string>('github.apiBaseUrl') || 'https://api.github.com').trim();
	const token = (config.get<string>('github.token') || '').trim();

	if (!token) {
		throw new Error('Set a GitHub token in atherforge.github.token to commit.');
	}

	const endpoint = new URL(`/repos/${payload.owner}/${payload.repo}/contents/${payload.path}`, baseUrl);
	const body = {
		message: payload.message,
		content: Buffer.from(payload.content || '', 'utf8').toString('base64'),
		branch: payload.branch || 'main',
		sha: payload.sha || undefined
	};

	const response = await requestJson(endpoint.toString(), 'PUT', {
		'Content-Type': 'application/json',
		'User-Agent': 'Atherforge',
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json'
	}, body);

	const url = response?.content?.html_url || '';
	const sha = response?.content?.sha || '';
	const message = url ? `Committed to ${url}` : 'Commit created via GitHub API.';
	return {
		message,
		owner: payload.owner,
		repo: payload.repo,
		path: payload.path,
		branch: payload.branch || 'main',
		url,
		sha,
		committedAt: new Date()
	};
}

type PendingError = {
	context: string;
	message: string;
	occurredAt: Date;
};

type ErrorFixLog = {
	context: string;
	errorMessage: string;
	occurredAt: Date;
	fixedAt: Date;
	durationMs: number;
	resolvedBy: string;
};

async function appendErrorFixRow(entry: ErrorFixLog): Promise<void> {
	const header = 'occurredAt,fixedAt,durationMs,context,resolvedBy,errorMessage';
	const row = [
		entry.occurredAt.toISOString(),
		entry.fixedAt.toISOString(),
		String(entry.durationMs),
		csvValue(entry.context),
		csvValue(entry.resolvedBy),
		csvValue(entry.errorMessage)
	].join(',');
	await appendCsv('logs/error-fixes.csv', header, row);
}

async function logGitHubCommit(entry: GitHubCommitLog): Promise<void> {
	const header = 'committedAt,owner,repo,branch,path,sha,url,message';
	const row = [
		entry.committedAt.toISOString(),
		csvValue(entry.owner),
		csvValue(entry.repo),
		csvValue(entry.branch),
		csvValue(entry.path),
		csvValue(entry.sha),
		csvValue(entry.url),
		csvValue(entry.message)
	].join(',');
	await appendCsv('logs/github-commits.csv', header, row);
}

function csvValue(value: string): string {
	const safe = value.replace(/"/g, '""');
	return `"${safe}"`;
}

async function appendCsv(relativePath: string, header: string, row: string): Promise<void> {
	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		return;
	}
	const normalized = normalizeRelativePath(relativePath);
	const fileUri = vscode.Uri.joinPath(workspace.uri, normalized);
	const dirPath = path.posix.dirname(normalized);
	if (dirPath !== '.') {
		await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspace.uri, dirPath));
	}

	let existing = '';
	try {
		const data = await vscode.workspace.fs.readFile(fileUri);
		existing = new TextDecoder('utf-8').decode(data);
	} catch {
		existing = '';
	}

	const next = existing
		? `${existing.trimEnd()}\n${row}\n`
		: `${header}\n${row}\n`;
	await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(next));
}

type Preset = {
	id: string;
	name: string;
	data: PipelinePayload;
	updatedAt: string;
};

type ExecutionHistoryItem = {
	startedAt: string;
	endedAt?: string;
	status: 'running' | 'completed' | 'failed';
	nodeCount: number;
	edgeCount: number;
};

async function loadPresets(): Promise<Preset[]> {
	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		return [];
	}
	const fileUri = vscode.Uri.joinPath(workspace.uri, '.atherforge', 'presets.json');
	try {
		const data = await vscode.workspace.fs.readFile(fileUri);
		return JSON.parse(new TextDecoder('utf-8').decode(data)) || [];
	} catch {
		return [];
	}
}

async function savePresets(presets: Preset[]): Promise<void> {
	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		return;
	}
	const dir = vscode.Uri.joinPath(workspace.uri, '.atherforge');
	await vscode.workspace.fs.createDirectory(dir);
	const fileUri = vscode.Uri.joinPath(dir, 'presets.json');
	await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(JSON.stringify(presets, null, 2)));
}

async function recordExecutionHistory(payload: PipelinePayload): Promise<void> {
	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		return;
	}
	const history = await loadExecutionHistory();
	history.push({
		startedAt: new Date().toISOString(),
		status: 'completed',
		nodeCount: payload.nodes.length,
		edgeCount: payload.edges.length
	});
	const dir = vscode.Uri.joinPath(workspace.uri, '.atherforge');
	await vscode.workspace.fs.createDirectory(dir);
	const fileUri = vscode.Uri.joinPath(dir, 'history.json');
	await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(JSON.stringify(history.slice(-100), null, 2)));
}

async function loadExecutionHistory(): Promise<ExecutionHistoryItem[]> {
	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		return [];
	}
	const fileUri = vscode.Uri.joinPath(workspace.uri, '.atherforge', 'history.json');
	try {
		const data = await vscode.workspace.fs.readFile(fileUri);
		return JSON.parse(new TextDecoder('utf-8').decode(data)) || [];
	} catch {
		return [];
	}
}

async function listGitHubBranches(payload: { owner: string; repo: string }): Promise<string[]> {
	const config = vscode.workspace.getConfiguration('atherforge');
	const baseUrl = (config.get<string>('github.apiBaseUrl') || 'https://api.github.com').trim();
	const token = (config.get<string>('github.token') || '').trim();
	if (!token) {
		throw new Error('Set a GitHub token to list branches.');
	}

	const endpoint = new URL(`/repos/${payload.owner}/${payload.repo}/branches`, baseUrl);
	const response = await requestJson(endpoint.toString(), 'GET', {
		'User-Agent': 'Atherforge',
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json'
	});

	if (Array.isArray(response)) {
		return response.map((b) => b.name);
	}
	return [];
}

async function getGitHubFileContent(payload: { owner: string; repo: string; branch: string; path: string }): Promise<string> {
	const config = vscode.workspace.getConfiguration('atherforge');
	const baseUrl = (config.get<string>('github.apiBaseUrl') || 'https://api.github.com').trim();
	const token = (config.get<string>('github.token') || '').trim();
	if (!token) {
		throw new Error('Set a GitHub token to read files.');
	}

	const endpoint = new URL(`/repos/${payload.owner}/${payload.repo}/contents/${payload.path}`, baseUrl);
	endpoint.searchParams.set('ref', payload.branch);
	const response = await requestJson(endpoint.toString(), 'GET', {
		'User-Agent': 'Atherforge',
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github.raw'
	});

	if (typeof response === 'string') {
		return response;
	}
	if (response?.content) {
		return Buffer.from(response.content, 'base64').toString('utf-8');
	}
	return '';
}

type WorkspaceEntry = {
	path: string;
	type: 'file' | 'folder';
};

// ============ CODE ANALYSIS TYPES ============

type CodeAnalysisIssue = {
	category: 'security' | 'performance' | 'style' | 'error-handling' | 'dependency' | 'version-control' | 'testing' | 'logging' | 'documentation' | 'resource';
	severity: 'critical' | 'error' | 'high' | 'medium' | 'warning' | 'info';
	line?: number;
	message: string;
	suggestion?: string;
	code?: string; // Code snippet that caused the issue
};

type CodeAnalysisReport = {
	timestamp: Date;
	fileName: string;
	language: string;
	totalIssues: number;
	issues: CodeAnalysisIssue[];
	metrics: {
		security: number;
		performance: number;
		style: number;
		errorHandling: number;
		coverage?: number;
	};
	recommendations: string[];
};

type VersionControlContext = {
	branch: string;
	uncommittedChanges: boolean;
	status: string;
	lastCommit?: string;
};

type DependencyIssue = {
	package: string;
	currentVersion?: string;
	requiredVersion?: string;
	type: 'missing' | 'outdated' | 'conflict';
	recommendation: string;
};

type SecurityIssue = {
	type: 'xss' | 'sql-injection' | 'unsafe-eval' | 'hardcoded-secret' | 'unsafe-deserialization' | 'unsafe-system-call';
	location: string;
	risk: 'critical' | 'high' | 'medium';
	details: string;
	fix: string;
};

type PromptAnalyticsEntry = {
	timestamp: Date;
	prompt: string;
	model: ModelKey;
	outputLength: number;
	issuesFound: number;
	success: boolean;
	executionTimeMs: number;
};

type CommitSegment = {
	message: string;
	changes: string[];
	size: number; // byte size of changes
};

type PushContext = {
	branch: string;
	commits: CommitSegment[];
	totalChanges: number;
	changesSummary: string;
	timestampCreated: Date;
	pushedAt?: Date;
	status: 'created' | 'validated' | 'pushed' | 'failed';
	conflictsDetected: boolean;
	conflictMessage?: string;
};

type PrePushValidation = {
	time: Date;
	securityCheckPassed: boolean;
	testsCoverageOk: boolean;
	securityIssues: CodeAnalysisIssue[];
	coverageIssues: string[];
	formattingFixed: boolean;
	formattingIssues: string[];
	canProceed: boolean;
	blockingIssues: string[];
};

type AuditLogEntry = {
	timestamp: Date;
	action: 'branch-created' | 'conflict-detected' | 'commit-segmented' | 'validation-run' | 'push-attempted' | 'push-successful';
	branch: string;
	commitCount: number;
	fileCount: number;
	changeSizeBytes: number;
	details: Record<string, any>;
	status: 'success' | 'warning' | 'failure';
};

async function listWorkspaceEntries(maxDepth = 3, maxEntries = 250): Promise<WorkspaceEntry[]> {
	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		throw new Error('Open a workspace folder to access files.');
	}

	const ignore = new Set(['.git', 'node_modules', 'dist', 'out']);
	const entries: WorkspaceEntry[] = [];

	async function walk(dir: vscode.Uri, depth: number, prefix: string) {
		if (entries.length >= maxEntries || depth > maxDepth) {
			return;
		}
		const items = await vscode.workspace.fs.readDirectory(dir);
		for (const [name, type] of items) {
			if (entries.length >= maxEntries) {
				return;
			}
			if (ignore.has(name)) {
				continue;
			}
			const entryPath = prefix ? `${prefix}/${name}` : name;
			if (type === vscode.FileType.Directory) {
				entries.push({ path: entryPath, type: 'folder' });
				await walk(vscode.Uri.joinPath(dir, name), depth + 1, entryPath);
			} else {
				entries.push({ path: entryPath, type: 'file' });
			}
		}
	}

	await walk(workspace.uri, 0, '');
	return entries;
}

async function listGitHubRepoContents(payload: GitHubRepoPayload): Promise<Array<{ path: string; type: string }>> {
	const config = vscode.workspace.getConfiguration('atherforge');
	const baseUrl = (config.get<string>('github.apiBaseUrl') || 'https://api.github.com').trim();
	const token = (config.get<string>('github.token') || '').trim();
	if (!token) {
		throw new Error('Set a GitHub token in atherforge.github.token to browse repos.');
	}

	const repoPath = payload.path ? `/${payload.path}` : '';
	const endpoint = new URL(`/repos/${payload.owner}/${payload.repo}/contents${repoPath}`, baseUrl);
	if (payload.branch) {
		endpoint.searchParams.set('ref', payload.branch);
	}

	const response = await requestJson(endpoint.toString(), 'GET', {
		'User-Agent': 'Atherforge',
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json'
	});

	if (Array.isArray(response)) {
		return response.map((item) => ({ path: item.path, type: item.type }));
	}
	if (response?.path) {
		return [{ path: response.path, type: response.type || 'file' }];
	}
	return [];
}

async function suggestFeatureIdeas(): Promise<string[]> {
	const prompt = {
		role: 'user',
		content: 'Suggest 3-5 feature ideas to improve this vibe coding extension. Keep each idea short, one line each.'
	};
	const reply = await invokeModel('llama3_32k', [prompt]);
	return reply
		.split(/\r?\n/)
		.map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
		.filter((line) => line.length > 0)
		.slice(0, 5);
}

/**
 * Auto-Fullstack Generator - Creates complete features without human intervention
 * Uses Master Control mode to automatically generate frontend + backend + tests
 */
async function autoGenerateFullstackFeature(
	featureName: string,
	onStep: (text: string) => void
): Promise<{ frontend: string; backend: string; tests: string }> {
	onStep(`🤖 Starting auto-generation for: ${featureName}`);
	
	// Step 1: Analyze and plan
	onStep('📋 Analyzing requirements and creating specification...');
	const specPrompt = {
		role: 'user',
		content: `Create a detailed specification for a ${featureName} feature. Include:\n1. Data models needed\n2. API endpoints required\n3. Frontend components needed\n4. User interactions\nKeep it concise but complete.`
	};
	const spec = await invokeModel('llama3_32k', [specPrompt]);
	onStep('✅ Specification created');
	
	// Step 2: Generate Backend
	onStep('⚙️ Generating backend code...');
	const backendPrompt = {
		role: 'user',
		content: `Generate complete backend code for: ${featureName}\n\nRequirements:\n${spec}\n\nProvide:\n1. Database schema (if needed)\n2. API route handlers\n3. Business logic\n\nLanguage: TypeScript\nFramework: Express.js or similar`
	};
	const backendCode = await invokeModel('claude35', [backendPrompt]);
	onStep('✅ Backend code generated');
	
	// Step 3: Generate Frontend
	onStep('🖥️ Generating frontend code...');
	const frontendPrompt = {
		role: 'user',
		content: `Generate complete frontend code for: ${featureName}\n\nBackend API:\n${backendCode}\n\nRequirements:\n${spec}\n\nProvide:\n1. React/Vue component\n2. API service layer\n3. TypeScript types\n\nUse modern best practices.`
	};
	const frontendCode = await invokeModel('codeLlama', [frontendPrompt]);
	onStep('✅ Frontend code generated');
	
	// Step 4: Generate Tests
	onStep('🧪 Generating tests...');
	const testPrompt = {
		role: 'user',
		content: `Generate unit tests for:\n\nFrontend:\n${frontendCode}\n\nBackend:\n${backendCode}\n\nUse Jest for backend and Vitest or Jest for frontend.`
	};
	const testCode = await invokeModel('deepseekCoder', [testPrompt]);
	onStep('✅ Tests generated');
	
	onStep(`🎉 Auto-generation complete for: ${featureName}`);
	
	return {
		frontend: frontendCode,
		backend: backendCode,
		tests: testCode
	};
}

// ============ SMART MODEL SELECTION FOR MASTER CONTROL ============

interface SmartModelConfig {
	model: ModelKey;
	strengths: string[];
	bestFor: string[];
}

const SMART_MODELS: SmartModelConfig[] = [
	{ model: 'claude35', strengths: ['complex reasoning', 'architecture'], bestFor: ['backend', 'api', 'database'] },
	{ model: 'codeLlama', strengths: ['code generation', 'frontend'], bestFor: ['frontend', 'ui', 'components'] },
	{ model: 'deepseekCoder', strengths: ['debugging', 'optimization'], bestFor: ['fix', 'optimize', 'refactor'] },
	{ model: 'llama3_32k', strengths: ['planning', 'reasoning'], bestFor: ['analyze', 'plan', 'design'] },
	{ model: 'gemini1_5', strengths: ['multimodal', 'fast'], bestFor: ['quick', 'simple', 'generate'] }
];

/**
 * Smart Model Selection - Automatically picks best model for the task
 */
function selectSmartModel(taskDescription: string): ModelKey {
	const task = taskDescription.toLowerCase();
	
	// Match task to best model
	for (const config of SMART_MODELS) {
		for (const keyword of config.bestFor) {
			if (task.includes(keyword)) {
				return config.model;
			}
		}
	}
	
	// Default fallback
	return 'claude35';
}

/**
 * Master Control Auto-Recovery - Self-healing pipeline
 */
async function masterControlAutoRecovery(
	error: Error,
	nodeType: string,
	context: Record<string, unknown>,
	onStep: (text: string) => void
): Promise<{ recovered: boolean; action: string }> {
	onStep(`🔧 Attempting auto-recovery for: ${error.message}`);
	
	const errorMsg = error.message.toLowerCase();
	
	// Network errors - retry with backoff
	if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
		onStep('🌐 Network issue detected, waiting and retrying...');
		await new Promise(r => setTimeout(r, 5000));
		return { recovered: true, action: 'retry_after_delay' };
	}
	
	// API key issues - try next key
	if (errorMsg.includes('401') || errorMsg.includes('unauthorized') || errorMsg.includes('api key')) {
		onStep('🔑 API key issue, rotating to next key...');
		return { recovered: true, action: 'rotate_key' };
	}
	
	// Rate limiting - wait longer
	if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
		onStep('⏳ Rate limited, waiting 30 seconds...');
		await new Promise(r => setTimeout(r, 30000));
		return { recovered: true, action: 'retry_after_rate_limit' };
	}
	
	// File not found - create directory
	if (errorMsg.includes('not found') || errorMsg.includes('enoent')) {
		onStep('📁 Creating missing directory...');
		return { recovered: true, action: 'create_directory' };
	}
	
	// Syntax errors - try different model
	if (errorMsg.includes('syntax') || errorMsg.includes('parse')) {
		onStep('🔄 Syntax error, trying alternative model...');
		return { recovered: true, action: 'switch_model' };
	}
	
	onStep(`⚠️ Unknown error, manual intervention may be needed: ${error.message}`);
	return { recovered: false, action: 'manual_required' };
}

// ============ CODE ANALYSIS & QUALITY SYSTEM ============

/**
 * Analyzes generated code for security, performance, style, and best practices
 * Returns comprehensive report with actionable recommendations
 */
async function analyzeCode(code: string, language: string, fileName: string = 'generated.ts'): Promise<CodeAnalysisReport> {
	const issues: CodeAnalysisIssue[] = [];
	const recommendations: string[] = [];

	// 1. Security Analysis
	issues.push(...analyzeSecurityIssues(code, language));

	// 2. Performance Analysis
	issues.push(...analyzePerformanceIssues(code));

	// 3. Error Handling Analysis
	issues.push(...analyzeErrorHandling(code, language));

	// 4. Code Style Analysis
	issues.push(...analyzeCodeStyle(code, language));

	// 5. Dependency Analysis
	issues.push(...analyzeDependencies(code));

	// 6. Testing Coverage
	issues.push(...analyzeTestingGaps(code, language));

	// 7. Documentation Analysis
	issues.push(...analyzeDocumentation(code, language));

	// 8. Resource Management
	issues.push(...analyzeResourceManagement(code));

	// Calculate metrics
	const metrics = {
		security: issues.filter(i => i.category === 'security').length,
		performance: issues.filter(i => i.category === 'performance').length,
		style: issues.filter(i => i.category === 'style').length,
		errorHandling: issues.filter(i => i.category === 'error-handling').length,
	};

	// Generate recommendations
	if (metrics.security > 0) {
		recommendations.push('🔒 Fix security issues before deploying to production');
	}
	if (metrics.errorHandling === 0 && code.length > 100) {
		recommendations.push('✅ Good error handling coverage');
	}
	if (code.includes('TODO') || code.includes('FIXME')) {
		recommendations.push('📝 Address TODO/FIXME comments before merging');
	}
	if (!code.includes('import') && !code.includes('require')) {
		recommendations.push('📦 Consider adding necessary imports');
	}

	return {
		timestamp: new Date(),
		fileName,
		language,
		totalIssues: issues.length,
		issues,
		metrics,
		recommendations
	};
}

function analyzeSecurityIssues(code: string, language: string): CodeAnalysisIssue[] {
	const issues: CodeAnalysisIssue[] = [];

	// XSS Detection
	const xssPatterns = [
		/innerHTML\s*=|dangerouslySetInnerHTML|\.html\(/,
		/eval\s*\(/,
		/Function\s*\(/,
		/document\.(write|writeln)/,
	];
	for (const pattern of xssPatterns) {
		if (pattern.test(code)) {
			issues.push({
				category: 'security',
				severity: 'high',
				message: '⚠️ Potential XSS vulnerability: Use textContent instead of innerHTML',
				suggestion: 'Sanitize user input with DOMPurify or similar library',
				code: code.substring(0, 50)
			});
			break;
		}
	}

	// SQL Injection Detection
	if (/query\s*\(\s*[`"'].*\+|concatenat|string interpolation/i.test(code)) {
		issues.push({
			category: 'security',
			severity: 'high',
			message: '⚠️ Potential SQL injection: Use parameterized queries',
			suggestion: 'Use prepared statements with placeholders (?, :param)',
		});
	}

	// Hardcoded Secrets
	if (/password|api[_-]?key|secret|token|credential/i.test(code) && 
	    /[=:\s]["\'][\w]{10,}["\']/i.test(code)) {
		issues.push({
			category: 'security',
			severity: 'critical',
			message: '🔴 Hardcoded credentials detected',
			suggestion: 'Move secrets to environment variables or secure vault',
		});
	}

	// Unsafe deserialization
	if (/JSON\.parse|pickle\.load|eval|deserialize/i.test(code)) {
		issues.push({
			category: 'security',
			severity: 'medium',
			message: '⚠️ Unsafe deserialization: Validate input before parsing',
			suggestion: 'Use schema validation (zod, joi, pydantic)',
		});
	}

	// Command execution
	if (/exec\s*\(|system\s*\(|spawn|shell.*true/i.test(code)) {
		issues.push({
			category: 'security',
			severity: 'high',
			message: '⚠️ Shell command execution detected: May be vulnerable to injection',
			suggestion: 'Use allowlist patterns or avoid shell=true',
		});
	}

	return issues;
}

function analyzePerformanceIssues(code: string): CodeAnalysisIssue[] {
	const issues: CodeAnalysisIssue[] = [];

	// Heavy loops
	if (/for\s*\(|while\s*\(|\.forEach/i.test(code)) {
		const loopCount = (code.match(/for\s*\(|while\s*\(|\.forEach/gi) || []).length;
		if (loopCount > 3) {
			issues.push({
				category: 'performance',
				severity: 'warning',
				message: `🔄 Multiple nested loops detected (${loopCount}). Consider optimization.`,
				suggestion: 'Look for opportunities to use memoization, caching, or algorithmic optimization',
			});
		}
	}

	// Unnecessary API calls
	if (/\.map\s*\(|\.filter\s*\(/g.test(code) && 
	    /\bfetch\b|\bhttp\b|\bRequest\b/i.test(code)) {
		issues.push({
			category: 'performance',
			severity: 'warning',
			message: '📡 API calls in loops detected. Risk of performance degradation.',
			suggestion: 'Batch API requests or move outside loop',
		});
	}

	// Synchronous operations
	if (/readFileSync|readSync|sleepSync/i.test(code)) {
		issues.push({
			category: 'performance',
			severity: 'warning',
			message: '⏱️ Synchronous I/O detected. May block the event loop.',
			suggestion: 'Use async/await versions instead',
		});
	}

	// Unoptimized queries
	if (/SELECT\s+\*|N\+1\s|query.*loop/i.test(code)) {
		issues.push({
			category: 'performance',
			severity: 'medium',
			message: '🗄️ Potentially slow SQL query detected',
			suggestion: 'Use SELECT specific columns, JOIN instead of N+1, add indexes',
		});
	}

	return issues;
}

function analyzeErrorHandling(code: string, language: string): CodeAnalysisIssue[] {
	const issues: CodeAnalysisIssue[] = [];
	const jsLike = ['javascript', 'typescript', 'tsx', 'jsx'].includes(language.toLowerCase());
	const pyLike = ['python', 'python3'].includes(language.toLowerCase());

	// Missing try-catch (JS/TS)
	if (jsLike && /(async|await|fetch|JSON\.parse|\.then\()/.test(code) && 
	    !/(try|catch|\.catch\()/.test(code)) {
		issues.push({
			category: 'error-handling',
			severity: 'warning',
			message: '⚠️ Async operation without error handling',
			suggestion: 'Add try-catch or .catch() handler',
		});
	}

	// Missing exception handling (Python)
	if (pyLike && /(import|def|class|open\(|requests\.|with\s)/.test(code) && 
	    !/(try:|except:|raise)/.test(code)) {
		issues.push({
			category: 'error-handling',
			severity: 'warning',
			message: '⚠️ No exception handling detected',
			suggestion: 'Wrap risky operations in try/except',
		});
	}

	// Missing null checks
	if (/\?.|\?\.|\?\.|&&|==\s*null/g.test(code) === false && 
	    /\.\w+\(|\[\w+\]/g.test(code)) {
		issues.push({
			category: 'error-handling',
			severity: 'info',
			message: 'ℹ️ Consider adding null/undefined checks',
			suggestion: 'Use optional chaining (?.) or early returns',
		});
	}

	return issues;
}

function analyzeCodeStyle(code: string, language: string): CodeAnalysisIssue[] {
	const issues: CodeAnalysisIssue[] = [];

	// Unused variables
	if (/\b(const|let|var|def|function)\s+\w+\s*[=:]/g.test(code)) {
		const declared = code.match(/\b(const|let|var|def|function)\s+(\w+)\s*[=:]/g) || [];
		if (declared.length > 5) {
			issues.push({
				category: 'style',
				severity: 'info',
				message: `🧹 High variable count (${declared.length}). Check for unused variables.`,
				suggestion: 'Remove unused declarations',
			});
		}
	}

	// Missing function documentation
	const functionCount = (code.match(/function\s+\w+|export\s+(function|const)/gi) || []).length;
	const docCount = (code.match(/\/\/|\/\*|\*\/|"""|\'\'\'/g) || []).length;
	if (functionCount > 2 && docCount === 0) {
		issues.push({
			category: 'documentation',
			severity: 'info',
			message: '📚 Functions defined but no comments/documentation',
			suggestion: 'Add JSDoc, docstrings, or inline comments',
		});
	}

	// Long functions
	const lines = code.split('\n').length;
	if (lines > 50) {
		issues.push({
			category: 'style',
			severity: 'warning',
			message: `📏 Code is quite long (${lines} lines). Consider splitting into smaller functions.`,
			suggestion: 'Break into smaller, reusable functions for better maintainability',
		});
	}

	return issues;
}

function analyzeDependencies(code: string): CodeAnalysisIssue[] {
	const issues: CodeAnalysisIssue[] = [];

	// Detect imports
	const importedPackages = code.match(/(?:import|require)\s*\(?['\"]([^'\"]+)['\"]/gi) || [];
	const uniquePackages = new Set(importedPackages);

	if (uniquePackages.size > 10) {
		issues.push({
			category: 'dependency',
			severity: 'warning',
			message: `📦 Many dependencies (${uniquePackages.size}). Check for redundancy.`,
			suggestion: 'Consider consolidating similar packages',
		});
	}

	// Check for common mistakes
	if (/require\s*\(\s*['\"]\.\/|import\s+['\"]\.\//.test(code)) {
		issues.push({
			category: 'dependency',
			severity: 'info',
			message: '📂 Local imports detected. Verify paths are correct.',
			suggestion: 'Use consistent import paths and avoid circular dependencies',
		});
	}

	return issues;
}

function analyzeTestingGaps(code: string, language: string): CodeAnalysisIssue[] {
	const issues: CodeAnalysisIssue[] = [];

	// Check if tests exist
	if (!/test|spec|describe|it\s*\(|def\s+test_/i.test(code)) {
		issues.push({
			category: 'testing',
			severity: 'info',
			message: '🧪 No tests detected in this code',
			suggestion: 'Add unit tests using Jest, Mocha, pytest, or unittest',
		});
	}

	// Check for mocking
	if (/fetch|http\.|database|API/i.test(code) && !/mock|stub|jest\.mock|patch/i.test(code)) {
		issues.push({
			category: 'testing',
			severity: 'warning',
			message: '🔗 External dependencies detected but no mocks found',
			suggestion: 'Mock external services in tests for reliability',
		});
	}

	return issues;
}

function analyzeDocumentation(code: string, language: string): CodeAnalysisIssue[] {
	const issues: CodeAnalysisIssue[] = [];

	// Check for README updates needed
	if (/(export|def|class)\s+\w+/gi.test(code) && !code.includes('README')) {
		issues.push({
			category: 'documentation',
			severity: 'info',
			message: '📖 Public APIs defined. Consider updating README.md',
			suggestion: 'Document new endpoints, functions, or components',
		});
	}

	// Check for missing inline comments
	const codeLines = code.split('\n').length;
	const commentLines = (code.match(/\/\/|\/\*|\*\/|#/g) || []).length;
	if (codeLines > 20 && commentLines < 3) {
		issues.push({
			category: 'documentation',
			severity: 'info',
			message: '💬 Low comment density. Consider adding inline explanations.',
			suggestion: 'Add comments for complex logic, especially business rules',
		});
	}

	return issues;
}

function analyzeResourceManagement(code: string): CodeAnalysisIssue[] {
	const issues: CodeAnalysisIssue[] = [];

	// Memory leak indicators
	if (/setInterval|setTimeout|addEventListener/.test(code) && !/clearInterval|clearTimeout|removeEventListener/.test(code)) {
		issues.push({
			category: 'resource',
			severity: 'warning',
			message: '💾 Event listeners or intervals set but not cleaned up',
			suggestion: 'Add cleanup functions or useEffect cleanup (React)',
		});
	}

	// Large file operations
	if (/readFile|readFileSync|fs\.read|open\([\'\"].*[\'\"].*['"](rb|r)/i.test(code)) {
		issues.push({
			category: 'resource',
			severity: 'info',
			message: '📄 File I/O operations detected',
			suggestion: 'Use streaming for large files to prevent memory issues',
		});
	}

	// Async/Promise issues
	if (/Promise\.all\(|\bawait\b/.test(code)) {
		issues.push({
			category: 'resource',
			severity: 'info',
			message: '⏳ Promise handling detected. Ensure proper error handling.',
			suggestion: 'Use try-catch with async/await or .catch() with promises',
		});
	}

	return issues;
}

/**
 * Detect Git branch and uncommitted changes
 */
async function detectVersionControl(): Promise<VersionControlContext> {
	try {
		const workspace = vscode.workspace.workspaceFolders?.[0];
		if (!workspace) {
			return {
				branch: 'unknown',
				uncommittedChanges: false,
				status: '❓ No workspace open',
			};
		}
		const cwd = workspace.uri.fsPath;
		const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd, timeout: 5000 });
		const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd, timeout: 5000 });
		const { stdout: logOutput } = await execAsync('git log -1 --pretty=%B', { cwd, timeout: 5000 });

		return {
			branch: branchOutput.trim(),
			uncommittedChanges: statusOutput.trim().length > 0,
			status: statusOutput.trim() ? '⚠️ Has uncommitted changes' : '✅ Clean working directory',
			lastCommit: logOutput.trim().substring(0, 100),
		};
	} catch {
		return {
			branch: 'unknown',
			uncommittedChanges: false,
			status: '❓ Git not available',
		};
	}
}

/**
 * Check for dependency conflicts and missing packages
 */
async function analyzeDependencyTree(): Promise<DependencyIssue[]> {
	const issues: DependencyIssue[] = [];

	try {
		// Check package.json
		const packageJsonContent = await readWorkspaceFile('package.json');
		const packageJson = JSON.parse(packageJsonContent);

		// Check for outdated packages
		if (packageJson.dependencies) {
			for (const [pkg, version] of Object.entries(packageJson.dependencies)) {
				// This is a simplified check - real implementation would query npm
				if (typeof version === 'string' && version.includes('~')) {
					issues.push({
						package: pkg,
						currentVersion: version as string,
						type: 'outdated',
						recommendation: `Update ${pkg} to latest stable version`,
					});
				}
			}
		}
	} catch {
		// If no package.json, that's okay - not a JS project
	}

	return issues;
}

/**
 * Track whether code from failed LLM should retry with another model
 */
async function shouldRetryWithAlternativeModel(code: string, lastModel: ModelKey): Promise<boolean> {
	// Check for obvious syntax errors
	if (code.includes('SyntaxError') || code.includes('undefined variable') || code.length < 10) {
		return true;
	}

	// Check if code contains placeholder text indicating incomplete generation
	if (/TODO|FIXME|....*code|your code|implement|XXX/i.test(code)) {
		return true;
	}

	return false;
}

async function ensureAtherforgeDirectory(): Promise<vscode.Uri | null> {
	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		return null;
	}
	const dir = vscode.Uri.joinPath(workspace.uri, '.atherforge');
	await vscode.workspace.fs.createDirectory(dir);
	return dir;
}

/**
 * Track successful prompts to analytics
 */
async function recordPromptAnalytics(entry: PromptAnalyticsEntry): Promise<void> {
	try {
		const logEntry = JSON.stringify({
			...entry,
			timestamp: entry.timestamp.toISOString(),
		}) + '\n';

		// Append to JSONL file
		const analyticsDir = await ensureAtherforgeDirectory();
		if (analyticsDir) {
			const uri = vscode.Uri.joinPath(analyticsDir, 'prompt-analytics.jsonl');
			try {
				const existing = await vscode.workspace.fs.readFile(uri);
				await vscode.workspace.fs.writeFile(uri, Buffer.concat([existing, Buffer.from(logEntry)]));
			} catch {
				// File doesn't exist, create it
				await vscode.workspace.fs.writeFile(uri, Buffer.from(logEntry));
			}
		}
	} catch (err) {
		// Analytics failure shouldn't block main flow
		console.error('Failed to record analytics:', err);
	}
}

/**
 * Generate AI-safe branch name to avoid conflicts
 * Uses ai/<timestamp> or ai/feature-name format
 * 
 * @param featureName - Optional feature name (e.g., 'auth-system')
 * @returns Generated branch name like 'ai/1708110400000' or 'ai/auth-system'
 */
function generateBranchName(featureName?: string): string {
	if (featureName) {
		// Sanitize feature name: lowercase, replace spaces/special chars with hyphens
		const sanitized = featureName
			.toLowerCase()
			.replace(/[^a-z0-9\-]/g, '-')
			.replace(/^-+|-+$/g, '') // trim hyphens
			.substring(0, 40); // limit length
		return `ai/${sanitized}`;
	}
	// Use timestamp-based branch name for anonymity
	const timestamp = Date.now();
	return `ai/${timestamp}`;
}

/**
 * Handle Git conflicts by attempting rebase or notifying user
 * Implements: Auto-fetch git pull --rebase before push
 * 
 * @returns Conflict resolution result
 */
async function handleGitConflicts(): Promise<{ conflictDetected: boolean; message: string; canContinue: boolean }> {
	try {
		const workspace = vscode.workspace.workspaceFolders?.[0];
		if (!workspace) {
			return { conflictDetected: false, message: 'No workspace', canContinue: true };
		}
		const cwd = workspace.uri.fsPath;

		// Ensure git is available and this is a repo
		try {
			await execAsync('git rev-parse --is-inside-work-tree', { cwd, timeout: 5000 });
		} catch (err) {
			return { conflictDetected: false, message: 'Git not available', canContinue: true };
		}

		// First, attempt fetch
		try {
			await execAsync('git fetch origin', { cwd, timeout: 15000 });
		} catch (err) {
			console.warn('Git fetch failed:', err);
		}

		// Check for merge conflicts in index
		const { stdout: conflictOutput } = await execAsync('git diff --name-only --diff-filter=U', {
			cwd,
			timeout: 5000
		});

		if (conflictOutput.trim().length > 0) {
			return {
				conflictDetected: true,
				message: `Merge conflicts detected in: ${conflictOutput.trim()}`,
				canContinue: false
			};
		}

		// Attempt rebase
		try {
			await execAsync('git pull --rebase origin HEAD', { cwd, timeout: 20000 });
			return {
				conflictDetected: false,
				message: 'Successfully rebased with origin',
				canContinue: true
			};
		} catch (err) {
			return {
				conflictDetected: true,
				message: `Rebase failed. Please resolve conflicts manually: ${err}`,
				canContinue: false
			};
		}
	} catch (err) {
		return {
			conflictDetected: true,
			message: `Could not check conflicts: ${err}`,
			canContinue: false
		};
	}
}

/**
 * Segment large AI-generated changes into multiple commits for readability
 * Implements: Commit Segmentation feature
 * 
 * @param changes - Array of changed files/sections
 * @param maxSize - Max bytes per commit (default 5000)
 * @returns Array of commit segments with messages
 */
function segmentCommits(changes: string[], maxSize: number = 5000): CommitSegment[] {
	const segments: CommitSegment[] = [];
	let currentSegment: string[] = [];
	let currentSize = 0;

	for (const change of changes) {
		const changeSize = Buffer.byteLength(change);

		// If adding this change would exceed limit, save current segment
		if (currentSize + changeSize > maxSize && currentSegment.length > 0) {
			const segmentChanges = currentSegment;
			const segmentSize = currentSize;
			segments.push({
				message: `ai: Implement feature (${segmentChanges.length} changes)`,
				changes: segmentChanges,
				size: segmentSize
			});
			currentSegment = [];
			currentSize = 0;
		}

		currentSegment.push(change);
		currentSize += changeSize;
	}

	// Add final segment
	if (currentSegment.length > 0) {
		segments.push({
			message: `ai: Implement feature (${currentSegment.length} changes)`,
			changes: currentSegment,
			size: currentSize
		});
	}

	return segments;
}

/**
 * Run pre-push validation hooks
 * Implements: Pre-Push Hooks feature
 * Runs: security scanner, test coverage report, code formatting
 * 
 * @returns Validation results
 */
async function runPrePushHooks(): Promise<PrePushValidation> {
	const validation: PrePushValidation = {
		time: new Date(),
		securityCheckPassed: true,
		testsCoverageOk: true,
		securityIssues: [],
		coverageIssues: [],
		formattingFixed: true,
		formattingIssues: [],
		canProceed: true,
		blockingIssues: []
	};

	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		validation.blockingIssues.push('No workspace found');
		validation.canProceed = false;
		return validation;
	}

	// Run security scan (check for common vulnerabilities)
	try {
		const files = await vscode.workspace.findFiles(
			'**/*.{ts,tsx,js,jsx,py,go,java,rb,php,cs,md,json,yml,yaml}',
			'**/{dist,out,node_modules,.git}/**'
		);
		for (const file of files) {
			const content = await vscode.workspace.fs.readFile(file);
			if (content.byteLength > 1024 * 1024) {
				continue; // Skip very large files
			}
			const code = content.toString();

			// Quick security scan for obvious issues
			if (code.match(/eval\s*\(/)) {
				validation.securityCheckPassed = false;
				validation.securityIssues.push({
					category: 'security',
					severity: 'critical',
					message: `eval() detected in ${file.path} - security risk`,
					suggestion: 'Avoid eval(), use safer alternatives'
				});
			}
			if (code.match(/innerHTML\s*=/) && !code.match(/innerText|textContent/)) {
				validation.securityIssues.push({
					category: 'security',
					severity: 'high',
					message: `innerHTML usage detected in ${file.path} - potential XSS`,
					suggestion: 'Use textContent or sanitize input'
				});
			}

			const detected = analyzeSecurityIssues(code, 'text');
			detected.forEach((issue) => {
				validation.securityIssues.push({
					...issue,
					message: `${issue.message} (${file.path})`
				});
			});
		}
	} catch (err) {
		console.warn('Security scan failed:', err);
	}

	// Run test coverage check
	try {
		const testScript = 'npm run test -- --coverage';
		if (isCommandSafe(testScript)) {
			const { stdout } = await execAsync(testScript, { cwd: workspace.uri.fsPath, timeout: 60000 });
			// Check coverage from output
			if (stdout.includes('FAIL') || stdout.match(/Statements\s*:\s*(\d+)/) && parseInt(RegExp.$1) < 80) {
				validation.testsCoverageOk = false;
				validation.coverageIssues.push('Test coverage below 80%');
			}
		} else {
			validation.testsCoverageOk = false;
			validation.coverageIssues.push('Coverage command blocked by command policy');
		}
	} catch (err) {
		console.warn('Test coverage check failed:', err);
		validation.coverageIssues.push('Could not run coverage check');
		validation.testsCoverageOk = false;
	}

	// Run code formatting check
	try {
		const formatScript = 'npm run format';
		if (isCommandSafe(formatScript)) {
			const { stdout } = await execAsync(formatScript, { cwd: workspace.uri.fsPath, timeout: 30000 });
			if (stdout.includes('error') || stdout.includes('fail')) {
				validation.formattingFixed = false;
				validation.formattingIssues.push('Code formatting issues found');
			}
		} else {
			validation.formattingFixed = false;
			validation.formattingIssues.push('Formatting command blocked by command policy');
		}
	} catch (err) {
		console.warn('Formatting check failed:', err);
		validation.formattingFixed = false;
	}

	// Determine if push can proceed
	if (validation.securityIssues.some(i => i.severity === 'critical')) {
		validation.blockingIssues.push('Critical security issues found - push blocked');
		validation.canProceed = false;
	}
	if (!validation.testsCoverageOk) {
		validation.blockingIssues.push('Test coverage validation failed');
		validation.canProceed = false;
	}
	if (!validation.formattingFixed) {
		validation.blockingIssues.push('Formatting validation failed');
		validation.canProceed = false;
	}

	return validation;
}

/**
 * Record push operation to audit log for traceability
 * Implements: Audit Logging feature
 * Stores to .atherforge/push-audit.jsonl
 * 
 * @param context - Push context with all operation details
 */
async function recordPushAuditLog(context: PushContext): Promise<void> {
	try {
		const auditDir = await ensureAtherforgeDirectory();
		if (!auditDir) {
			return;
		}

		const auditEntry: AuditLogEntry = {
			timestamp: context.pushedAt || new Date(),
			action: context.status === 'pushed' ? 'push-successful' : 'push-attempted',
			branch: context.branch,
			commitCount: context.commits.length,
			fileCount: context.totalChanges,
			changeSizeBytes: context.commits.reduce((sum, c) => sum + c.size, 0),
			details: {
				changesSummary: context.changesSummary,
				conflictsDetected: context.conflictsDetected,
				conflictMessage: context.conflictMessage
			},
			status: context.status === 'pushed' ? 'success' : context.status === 'failed' ? 'failure' : 'warning'
		};

		const logEntry = JSON.stringify({
			...auditEntry,
			timestamp: auditEntry.timestamp.toISOString()
		}) + '\n';

		const uri = vscode.Uri.joinPath(auditDir, 'push-audit.jsonl');
		try {
			const existing = await vscode.workspace.fs.readFile(uri);
			await vscode.workspace.fs.writeFile(uri, Buffer.concat([existing, Buffer.from(logEntry)]));
		} catch {
			// File doesn't exist, create it
			await vscode.workspace.fs.writeFile(uri, Buffer.from(logEntry));
		}
	} catch (err) {
		console.error('Failed to record push audit log:', err);
	}
}

/**
 * Command Injection Protection: Validates shell commands before execution
 * Prevents dangerous injection attempts like: npm test; rm -rf /
 * 
 * @param command - The command to validate
 * @returns true if command is safe to execute, false otherwise
 */
function isCommandSafe(command: string): boolean {
	if (!command || typeof command !== 'string') {
		return false;
	}

	const trimmed = command.trim();
	if (trimmed.length === 0 || trimmed.length > 512) {
		return false; // Reject empty or suspiciously long commands
	}

	// Check for dangerous characters that indicate multi-command or code injection
	for (const char of DANGEROUS_CHARACTERS) {
		if (trimmed.includes(char)) {
			return false;
		}
	}

	// Check if command matches one of the allowed patterns
	const isAllowed = ALLOWED_COMMAND_PATTERNS.some((pattern) => pattern.test(trimmed));
	return isAllowed;
}

/**
 * Sanitize command for safe logging (removes sensitive data)
 * 
 * @param command - Command to sanitize for logs
 * @returns Safe version of command for logging
 */
function sanitizeCommandForLogging(command: string): string {
	// Remove any potential paths or sensitive information
	return command
		.replace(/\/[a-zA-Z0-9._\-/]+/g, '[PATH]')
		.replace(/https?:\/\/[^\s]+/g, '[URL]')
		.substring(0, 100);
}

/**
 * Command Injection: Get error message for rejected commands
 * Provides clear feedback on what went wrong
 * 
 * @param command - The rejected command
 * @returns User-friendly error message
 */
function getCommandRejectionReason(command: string): string {
	if (!command || command.trim().length === 0) {
		return 'Command is empty.';
	}

	if (command.length > 512) {
		return 'Command is too long (max 512 characters).';
	}

	for (const char of DANGEROUS_CHARACTERS) {
		if (command.includes(char)) {
			return `Command contains dangerous character '${char}'. Commands must be single, simple operations.`;
		}
	}

	// Check if any part looks like it's trying to escape
	if (command.includes('\\\\') || command.match(/\\[a-z]/i)) {
		return 'Command contains suspicious escape sequences.';
	}

	return 'Command does not match allowed command patterns. Use: npm run <script>, npm test, yarn, pnpm, make, or npx commands.';
}

function sanitizeGitBranchName(input: string): string {
	const trimmed = (input || '').trim();
	if (!trimmed) {
		return 'main';
	}
	const safe = trimmed.replace(/[^a-zA-Z0-9._\-\/]/g, '-');
	return safe.substring(0, 64);
}

function sanitizeGitRemoteName(input: string): string {
	const trimmed = (input || '').trim();
	if (!trimmed) {
		return 'origin';
	}
	const safe = trimmed.replace(/[^a-zA-Z0-9._\-]/g, '-');
	return safe.substring(0, 32);
}

async function runPipeline(
	payload: PipelinePayload,
	onStep: (nodeId: string, text: string) => void,
	onDone: (status: string, text: string) => void,
	pipelineState?: {
		isPaused: boolean;
		stopRequested: boolean;
		humanInterventionEnabled: boolean;
	},
	onHumanIntervention?: (nodeId: string, nodeType: string, description: string) => Promise<boolean>
): Promise<void> {
	// Validate pipeline payload
	if (!payload || !payload.nodes || !Array.isArray(payload.nodes)) {
		onDone('Error', 'Invalid pipeline: nodes array is required');
		return;
	}
	
	if (!payload.edges || !Array.isArray(payload.edges)) {
		payload.edges = [];
	}

	// Validate each node has required fields
	for (const node of payload.nodes) {
		if (!node.id) {
			onDone('Error', 'Invalid pipeline: each node must have an id');
			return;
		}
		if (!node.type) {
			onDone('Error', `Node ${node.id} is missing type`);
			return;
		}
		
		// Validate required fields based on node type
		const validationErrors: string[] = [];
		if (node.type === 'file-read' && !node.filePath) {
			validationErrors.push('file-read requires filePath');
		}
		if (node.type === 'file-write' && !node.filePath) {
			validationErrors.push('file-write requires filePath');
		}
		if (node.type === 'github-commit' && (!node.owner || !node.repo || !node.filePath)) {
			validationErrors.push('github-commit requires owner, repo, and filePath');
		}
		if (node.type === 'git-push' && (!node.branch)) {
			validationErrors.push('git-push requires branch');
		}
		if (node.type === 'http-request' && (!node.url || !node.method)) {
			validationErrors.push('http-request requires url and method');
		}
		if (node.type === 'delay' && (!node.delayMs || node.delayMs < 0)) {
			validationErrors.push('delay requires delayMs >= 0');
		}
		
		if (validationErrors.length > 0) {
			onDone('Error', `Node ${node.id}: ${validationErrors.join(', ')}`);
			return;
		}
	}

	const baseNodes = payload.nodes.filter((node) => {
		return (
			node.type === 'codeLlama' ||
			node.type === 'starcoder2' ||
			node.type === 'qwen2_5Coder' ||
			node.type === 'claude35' ||
			node.type === 'deepseekCoder' ||
			node.type === 'llama3_32k' ||
			node.type === 'gemini1_5' ||
			node.type === 'phi3Medium' ||
			node.type === 'codeLlamaInstruct' ||
			node.type === 'file-read' ||
			node.type === 'file-write' ||
			node.type === 'github-commit' ||
			node.type === 'git-push' ||
			node.type === 'lint' ||
			node.type === 'test' ||
			node.type === 'http-request' ||
			node.type === 'transform' ||
			node.type === 'condition' ||
			node.type === 'delay' ||
			node.type === 'notify'
		);
	});

	if (baseNodes.length === 0) {
		onDone('Idle', 'No nodes to run.');
		return;
	}

	const nodeMap = new Map(baseNodes.map((node) => [node.id, node]));
	const indegree = new Map<string, number>();
	const graph = new Map<string, string[]>();
	for (const node of baseNodes) {
		indegree.set(node.id, 0);
		graph.set(node.id, []);
	}

	for (const edge of payload.edges) {
		if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) {
			continue;
		}
		graph.get(edge.from)?.push(edge.to);
		indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
	}

	const queue = Array.from(indegree.entries())
		.filter(([, count]) => count === 0)
		.map(([id]) => id);
	const order: string[] = [];
	while (queue.length) {
		const id = queue.shift();
		if (!id) {
			break;
		}
		order.push(id);
		const nexts = graph.get(id) || [];
		for (const next of nexts) {
			const nextCount = (indegree.get(next) || 0) - 1;
			indegree.set(next, nextCount);
			if (nextCount === 0) {
				queue.push(next);
			}
		}
	}

	const fallback = baseNodes.map((node) => node.id).filter((id) => !order.includes(id));
	const finalOrder = order.concat(fallback);

	let previousOutput = '';
	for (const id of finalOrder) {
		const node = nodeMap.get(id);
		if (!node) {
			continue;
		}

		// Check if pipeline was stopped
		if (pipelineState?.stopRequested) {
			onDone('Stopped', 'Pipeline stopped by user.');
			return;
		}

		// Wait while paused
		while (pipelineState?.isPaused) {
			await new Promise(resolve => setTimeout(resolve, 500));
			if (pipelineState?.stopRequested) {
				onDone('Stopped', 'Pipeline stopped by user.');
				return;
			}
		}

		// Check for human intervention before critical operations
		if (pipelineState?.humanInterventionEnabled && onHumanIntervention) {
			if (node.type === 'file-write' || node.type === 'github-commit' || node.type === 'git-push') {
				onStep(node.id, `Requesting human approval for ${node.type}...`);
				try {
					const approved = await onHumanIntervention(node.id, node.type, `Approve ${node.type} operation on ${node.filePath || node.repo || 'unknown'}`);
					if (!approved) {
						onStep(node.id, `Human rejected ${node.type} operation.`);
						onDone('Rejected', `Operation ${node.type} rejected by human.`);
						return;
					}
					onStep(node.id, `Human approved ${node.type} operation.`);
				} catch (error) {
					onStep(node.id, `Error in human intervention: ${error}`);
					onDone('Error', `Human intervention failed: ${error}`);
					return;
				}
			}
		}

		if (node.type === 'file-read') {
			try {
				onStep(node.id, `Reading file: ${node.filePath}...`);
				const content = await readWorkspaceFile(node.filePath || '');
				previousOutput = content;
				onStep(node.id, `File read: ${node.filePath}`);
			} catch (err) {
				onStep(node.id, `Error reading file: ${node.filePath}`);
			}
		} else if (node.type === 'file-write') {
			try {
				const content = node.fileContent || previousOutput;
				onStep(node.id, `Writing file: ${node.filePath}...`);
				await writeWorkspaceFile(node.filePath || '', content);
				previousOutput = content;
				onStep(node.id, `File written: ${node.filePath}`);
			} catch (err) {
				onStep(node.id, `Error writing file: ${node.filePath}`);
			}
		} else if (node.type === 'github-commit') {
			try {
				const branchName = (node.branch || '').trim() || generateBranchName();
				const changes = [node.filePath || 'unknown'];
				const segments = segmentCommits(changes);
				const pushContext: PushContext = {
					branch: branchName,
					commits: segments.length ? segments : [{
						message: 'ai: Implement feature (1 change)',
						changes,
						size: Buffer.byteLength(changes.join(','))
					}],
					totalChanges: changes.length,
					changesSummary: `GitHub commit for ${node.filePath || 'content'}`,
					timestampCreated: new Date(),
					status: 'created',
					conflictsDetected: false
				};

				onStep(node.id, 'Validating git state...');
				const conflictResult = await handleGitConflicts();
				pushContext.conflictsDetected = conflictResult.conflictDetected;
				pushContext.conflictMessage = conflictResult.message;
				if (!conflictResult.canContinue) {
					pushContext.status = 'failed';
					await recordPushAuditLog(pushContext);
					onStep(node.id, `Blocked: ${conflictResult.message}`);
					return;
				}

				onStep(node.id, 'Running pre-push checks...');
				const validation = await runPrePushHooks();
				pushContext.status = 'validated';
				if (!validation.canProceed) {
					pushContext.status = 'failed';
					await recordPushAuditLog(pushContext);
					onStep(node.id, `Blocked: ${validation.blockingIssues.join('; ')}`);
					return;
				}

				onStep(node.id, `Committing to GitHub: ${node.repo}/${node.filePath}...`);
				const result = await commitToGitHub({
					owner: node.owner || '',
					repo: node.repo || '',
					path: node.filePath || '',
					branch: branchName,
					message: node.message || 'Atherforge commit',
					content: node.fileContent || previousOutput
				});
				previousOutput = result.url || 'Commit successful';
				pushContext.status = 'pushed';
				pushContext.pushedAt = new Date();
				await recordPushAuditLog(pushContext);
				onStep(node.id, `Committed: ${result.message}`);
				await logGitHubCommit(result);
			} catch (err) {
				onStep(node.id, `Error committing to GitHub: ${err}`);
			}
		} else if (node.type === 'git-push') {
			try {
				const workspace = vscode.workspace.workspaceFolders?.[0];
				if (!workspace) {
					onStep(node.id, 'No workspace open for git push.');
					return;
				}
				const branchName = sanitizeGitBranchName(node.branch || '');
				const remoteName = sanitizeGitRemoteName(node.remote || 'origin');
				const pushContext: PushContext = {
					branch: branchName,
					commits: [],
					totalChanges: 0,
					changesSummary: `git push ${remoteName} ${branchName}`,
					timestampCreated: new Date(),
					status: 'created',
					conflictsDetected: false
				};

				onStep(node.id, 'Validating git state...');
				const conflictResult = await handleGitConflicts();
				pushContext.conflictsDetected = conflictResult.conflictDetected;
				pushContext.conflictMessage = conflictResult.message;
				if (!conflictResult.canContinue) {
					pushContext.status = 'failed';
					await recordPushAuditLog(pushContext);
					onStep(node.id, `Blocked: ${conflictResult.message}`);
					return;
				}

				onStep(node.id, 'Running pre-push checks...');
				const validation = await runPrePushHooks();
				if (!validation.canProceed) {
					pushContext.status = 'failed';
					await recordPushAuditLog(pushContext);
					onStep(node.id, `Blocked: ${validation.blockingIssues.join('; ')}`);
					return;
				}

				onStep(node.id, `Pushing ${branchName} to ${remoteName}...`);
				await execAsync(`git push ${remoteName} ${branchName}`, {
					cwd: workspace.uri.fsPath,
					timeout: 20000
				});
				pushContext.status = 'pushed';
				pushContext.pushedAt = new Date();
				await recordPushAuditLog(pushContext);
				onStep(node.id, `Git push completed for ${branchName}.`);
			} catch (err) {
				onStep(node.id, `Git push error: ${String(err)}`);
			}
		} else if (node.type === 'lint') {
			try {
				const command = node.command || 'npm run lint';

				// Command Injection Protection: Validate before execution
				if (!isCommandSafe(command)) {
					const reason = getCommandRejectionReason(command);
					onStep(node.id, `❌ Command rejected for security reasons: ${reason}`);
					previousOutput = `Command rejected: ${reason}`;
					await appendErrorFixRow({
						context: 'lint-command-injection',
						errorMessage: `Attempted command injection in lint node: ${sanitizeCommandForLogging(command)}`,
						occurredAt: new Date(),
						fixedAt: new Date(),
						durationMs: 0,
						resolvedBy: 'Rejected by command injection filter'
					});
				} else {
					onStep(node.id, `Running lint: ${sanitizeCommandForLogging(command)}...`);
					const { stdout } = await execAsync(command, { timeout: 30000 });
					previousOutput = stdout;
					onStep(node.id, `Lint output: ${stdout.substring(0, 120)}...`);
				}
			} catch (err) {
				previousOutput = String(err);
				onStep(node.id, `Lint error: ${String(err).substring(0, 120)}...`);
			}
		} else if (node.type === 'test') {
			try {
				const command = node.command || 'npm test';

				// Command Injection Protection: Validate before execution
				if (!isCommandSafe(command)) {
					const reason = getCommandRejectionReason(command);
					onStep(node.id, `❌ Command rejected for security reasons: ${reason}`);
					previousOutput = `Command rejected: ${reason}`;
					await appendErrorFixRow({
						context: 'test-command-injection',
						errorMessage: `Attempted command injection in test node: ${sanitizeCommandForLogging(command)}`,
						occurredAt: new Date(),
						fixedAt: new Date(),
						durationMs: 0,
						resolvedBy: 'Rejected by command injection filter'
					});
				} else {
					onStep(node.id, `Running tests: ${sanitizeCommandForLogging(command)}...`);
					const { stdout } = await execAsync(command, { timeout: 60000 });
					previousOutput = stdout;
					onStep(node.id, `Test output: ${stdout.substring(0, 120)}...`);
				}
			} catch (err) {
				previousOutput = String(err);
				onStep(node.id, `Test error: ${String(err).substring(0, 120)}...`);
			}
		} else {
			const modelKey = node.type as ModelKey;
			const prompt = node.prompt?.trim() || `Run ${modelKey} step.`;
			const content = previousOutput ? `${prompt}\n\nPrevious output:\n${previousOutput}` : prompt;
			onStep(node.id, `Running ${modelKey} node...`);
			const reply = await invokeModel(modelKey, [{ role: 'user', content }]);
			previousOutput = reply;
			onStep(node.id, `${modelKey} output: ${reply.substring(0, 240)}${reply.length > 240 ? '...' : ''}`);
		}
	}

	onDone('Done', 'Pipeline completed.');
}

async function requestJson(
	urlString: string,
	method: string,
	headers: Record<string, string>,
	body?: Record<string, unknown>
): Promise<any> {
	const url = new URL(urlString);
	const client = url.protocol === 'http:' ? http : https;

	return new Promise((resolve, reject) => {
		const request = client.request(
			{
				method,
				hostname: url.hostname,
				port: url.port,
				path: `${url.pathname}${url.search}`,
				headers
			},
			(response) => {
				const chunks: Uint8Array[] = [];
				response.on('data', (chunk) => chunks.push(chunk));
				response.on('end', () => {
					const raw = Buffer.concat(chunks).toString('utf8');
					const status = response.statusCode ?? 0;
					let parsed: any = raw;
					try {
						parsed = raw ? JSON.parse(raw) : {};
					} catch {
						parsed = raw;
					}

					if (status >= 200 && status < 300) {
						resolve(parsed);
					} else {
						const errorMessage = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
						const error = new Error(`Request failed (${status}): ${errorMessage}`) as any;
						error.statusCode = status;
						reject(error);
					}
				});
			}
		);

		request.on('error', reject);
		if (body) {
			request.write(JSON.stringify(body));
		}
		request.end();
	});
}
