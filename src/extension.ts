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
	const document = editor.document;
	const position = editor.selection.active;

	// First try to extract parameter name
	const parameter = extractParameterName(document, position);
	if (parameter) {
		const block = findEnclosingBlock(document, position);
		if (block) {
			return {
				typeName: block.typeName,
				kind: block.kind,
				parameter: parameter,
			};
		}
	}

	// If not a parameter, try to extract resource/data source type name
	const identifier = extractTerraformIdentifier(document, position);
	if (!identifier) {
		return undefined;
	}

	const kind = detectBlockKind(document, identifier.range);
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

const PARAMETER_PATTERN = /[A-Za-z0-9_]+/;

function extractParameterName(
	document: vscode.TextDocument,
	position: vscode.Position,
): string | undefined {
	const wordRange = document.getWordRangeAtPosition(
		position,
		PARAMETER_PATTERN,
	);
	if (!wordRange) {
		return undefined;
	}

	const word = document.getText(wordRange).trim();
	const lineText = document.lineAt(position.line).text;

	// Check if this is a parameter assignment (parameter_name = value)
	const parameterMatch = lineText.match(/^\s*([A-Za-z0-9_]+)\s*=/);
	if (parameterMatch && parameterMatch[1] === word) {
		return word;
	}

	return undefined;
}

interface BlockInfo {
	typeName: string;
	kind: TerraformBlockKind;
}

function findEnclosingBlock(
	document: vscode.TextDocument,
	position: vscode.Position,
): BlockInfo | undefined {
	// Search upward for resource or data block
	for (let lineNumber = position.line; lineNumber >= 0; lineNumber--) {
		const lineText = document.lineAt(lineNumber).text;

		// Match resource "type_name" "name" { or data "type_name" "name" {
		const blockMatch = lineText.match(
			/^\s*(resource|data)\s+"([A-Za-z0-9_]+)"\s+"[^"]+"\s*\{/,
		);
		if (blockMatch) {
			const kind: TerraformBlockKind =
				blockMatch[1] === "data" ? "data-source" : "resource";
			const typeName = blockMatch[2];

			if (typeName && RESOURCE_NAME_PATTERN.test(typeName)) {
				return { typeName, kind };
			}
		}
	}

	return undefined;
}
