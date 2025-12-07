import * as vscode from "vscode";
import {
	buildTerraformDocsUrl,
	type TerraformBlockKind,
	type TerraformTarget,
} from "./terraformDocs";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("tfdoc.openDocs", openDocs),
	);
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
		vscode.window.showErrorMessage(
			'Place the cursor on a Terraform resource/data source type string, e.g. "aws_instance".',
		);
		return;
	}

	const docUrl = buildTerraformDocsUrl(target);
	if (!docUrl) {
		vscode.window.showErrorMessage(
			`Could not derive Terraform Registry URL for "${target.typeName}".`,
		);
		return;
	}

	const docUri = vscode.Uri.parse(docUrl);
	const opened = await vscode.env.openExternal(docUri);
	if (!opened) {
		vscode.window.showErrorMessage(`Failed to open ${docUrl}.`);
		return;
	}

	vscode.window.setStatusBarMessage(
		`Opening Terraform docs for ${target.typeName}...`,
		3000,
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

const RESOURCE_WORD_PATTERN = /[A-Za-z0-9_]+/;
const RESOURCE_NAME_PATTERN = /^[A-Za-z0-9]+_[A-Za-z0-9_]+$/;

interface TerraformIdentifier {
	value: string;
	range: vscode.Range;
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
