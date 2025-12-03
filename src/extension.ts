import * as vscode from "vscode";

const STATUS_MESSAGE_DURATION_MS = 3000;
const ERROR_NO_TARGET =
	'Place the cursor on a Terraform resource/data source type string, e.g. "aws_instance".';

const RESOURCE_WORD_PATTERN = /[A-Za-z0-9_]+/;
const RESOURCE_NAME_PATTERN = /^[A-Za-z0-9]+_[A-Za-z0-9_]+$/;
const DEFAULT_PROVIDER_NAMESPACE = "hashicorp";

type TerraformBlockKind = "resource" | "data-source";

interface TerraformTarget {
	typeName: string;
	kind: TerraformBlockKind;
}

interface TerraformIdentifier {
	value: string;
	range: vscode.Range;
}

const providerNamespaceOverrides: Record<string, string> = {
	okta: "okta",
	datadog: "DataDog",
	docker: "kreuzwerker",
	sakuracloud: "sacloud",
};

export function activate(context: vscode.ExtensionContext) {
	const openDocsCommand = vscode.commands.registerCommand(
		"tfdoc.openDocs",
		openDocs,
	);

	context.subscriptions.push(openDocsCommand);
}

export function deactivate() {}

async function openDocs() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage("No active editor.");
		return;
	}

	const target = resolveTerraformTarget(editor);
	if (!target) {
		vscode.window.showErrorMessage(ERROR_NO_TARGET);
		return;
	}

	const docUri = buildTerraformDocsUri(target);
	if (!docUri) {
		vscode.window.showErrorMessage(
			`Could not derive Terraform Registry URL for "${target.typeName}".`,
		);
		return;
	}

	const opened = await vscode.env.openExternal(docUri);
	if (!opened) {
		vscode.window.showErrorMessage(`Failed to open ${docUri.toString()}.`);
		return;
	}

	const noun = target.kind === "data-source" ? "data source" : "resource";
	vscode.window.setStatusBarMessage(
		`Opening Terraform ${noun} docs for ${target.typeName}...`,
		STATUS_MESSAGE_DURATION_MS,
	);
}

function resolveTerraformTarget(
	editor: vscode.TextEditor,
): TerraformTarget | undefined {
	const identifier = extractTerraformIdentifier(
		editor.document,
		editor.selection.active,
	);
	if (!identifier) {
		return undefined;
	}

	const kind = detectBlockKind(editor.document, identifier.range);
	if (!kind) {
		return undefined;
	}

	return { typeName: identifier.value, kind };
}

function extractTerraformIdentifier(
	document: vscode.TextDocument,
	position: vscode.Position,
): TerraformIdentifier | undefined {
	const wordRange = document.getWordRangeAtPosition(
		position,
		RESOURCE_WORD_PATTERN,
	);
	if (!wordRange) {
		return undefined;
	}

	const rawWord = document.getText(wordRange).trim();
	if (!RESOURCE_NAME_PATTERN.test(rawWord)) {
		return undefined;
	}

	if (!isQuoted(document, wordRange)) {
		return undefined;
	}

	return { value: rawWord, range: wordRange };
}

function detectBlockKind(
	document: vscode.TextDocument,
	identifierRange: vscode.Range,
): TerraformBlockKind | undefined {
	const lineText = document.lineAt(identifierRange.start.line).text;
	const prefix = lineText.slice(0, identifierRange.start.character);
	const keywordMatch = prefix.match(/\b(resource|data)\s*"$/);
	if (!keywordMatch) {
		return undefined;
	}

	return keywordMatch[1] === "data" ? "data-source" : "resource";
}

function isQuoted(
	document: vscode.TextDocument,
	wordRange: vscode.Range,
): boolean {
	const lineText = document.lineAt(wordRange.start.line).text;
	const startCharacter = wordRange.start.character;
	const endCharacter = wordRange.end.character;
	const charBefore =
		startCharacter > 0 ? lineText.charAt(startCharacter - 1) : "";
	const charAfter =
		endCharacter < lineText.length ? lineText.charAt(endCharacter) : "";
	return charBefore === '"' && charAfter === '"';
}

function buildTerraformDocsUri(
	target: TerraformTarget,
): vscode.Uri | undefined {
	const lower = target.typeName.toLowerCase();
	const [provider, ...rest] = lower.split("_");
	if (!provider || rest.length === 0) {
		return undefined;
	}

	const resourcePath = rest.join("_");
	const namespace = getProviderNamespace(provider);
	const segment = target.kind === "data-source" ? "data-sources" : "resources";
	const url = `https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs/${segment}/${resourcePath}`;
	return vscode.Uri.parse(url);
}

function getProviderNamespace(provider: string): string {
	return providerNamespaceOverrides[provider] ?? DEFAULT_PROVIDER_NAMESPACE;
}
