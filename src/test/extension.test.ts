import * as assert from "node:assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
	async function activateExtension() {
		const extension = vscode.extensions.getExtension("mi-wada.tfdoc");
		assert.ok(extension, 'Extension "mi-wada.tfdoc" is not found.');
		await extension.activate();
	}

	function tryStubMethod<T extends object, K extends keyof T>(
		target: T,
		key: K,
		replacement: T[K],
	): (() => void) | undefined {
		try {
			const descriptor = Object.getOwnPropertyDescriptor(target, key);
			Object.defineProperty(target, key, {
				value: replacement,
				configurable: true,
				writable: true,
			});
			return () => {
				if (descriptor) {
					Object.defineProperty(target, key, descriptor);
				} else {
					delete (target as Record<string, unknown>)[key as string];
				}
			};
		} catch {
			return undefined;
		}
	}

	test("registers the open docs command", async () => {
		await activateExtension();
		const commands = await vscode.commands.getCommands(true);
		assert.ok(
			commands.includes("tfdoc.openDocs"),
			'"tfdoc.openDocs" command is not registered.',
		);
	});

	test("shows a helpful error when cursor is not on a resource type", async function () {
		await activateExtension();

		const captured: string[] = [];
		const restore = tryStubMethod(vscode.window, "showErrorMessage", ((
			message: string,
		) => {
			captured.push(message);
			return Promise.resolve(undefined);
		}) as typeof vscode.window.showErrorMessage);
		if (!restore) {
			this.skip();
		}

		try {
			const document = await vscode.workspace.openTextDocument({
				language: "terraform",
				content: 'resource "aws_instance" "example" {}',
			});
			const editor = await vscode.window.showTextDocument(document);

			const line = document.lineAt(0).text;
			const index = line.indexOf("example");
			assert.ok(index >= 0, 'Failed to find "example" in test document.');

			editor.selection = new vscode.Selection(
				new vscode.Position(0, index + 1),
				new vscode.Position(0, index + 1),
			);

			await vscode.commands.executeCommand("tfdoc.openDocs");

			assert.deepStrictEqual(captured, [
				'Place the cursor on a Terraform resource/data source type string, e.g. "aws_instance".',
			]);
		} finally {
			restore();
		}
	});

	test("opens Terraform Registry docs when cursor is on a resource type", async function () {
		await activateExtension();

		const openedUris: string[] = [];
		const statusMessages: Array<{ message: string; timeout?: number }> = [];
		const errors: string[] = [];

		const restoreOpenExternal = tryStubMethod(vscode.env, "openExternal", ((
			uri: vscode.Uri,
		) => {
			openedUris.push(uri.toString());
			return Promise.resolve(true);
		}) as typeof vscode.env.openExternal);
		const restoreStatusBarMessage = tryStubMethod(
			vscode.window,
			"setStatusBarMessage",
			((message: string, timeout?: number) => {
				statusMessages.push({ message, timeout });
				return { dispose() {} };
			}) as typeof vscode.window.setStatusBarMessage,
		);
		const restoreShowErrorMessage = tryStubMethod(
			vscode.window,
			"showErrorMessage",
			((message: string) => {
				errors.push(message);
				return Promise.resolve(undefined);
			}) as typeof vscode.window.showErrorMessage,
		);

		if (
			!restoreOpenExternal ||
			!restoreStatusBarMessage ||
			!restoreShowErrorMessage
		) {
			this.skip();
		}

		try {
			const document = await vscode.workspace.openTextDocument({
				language: "terraform",
				content: 'resource "aws_instance" "example" {}',
			});
			const editor = await vscode.window.showTextDocument(document);

			const line = document.lineAt(0).text;
			const index = line.indexOf("aws_instance");
			assert.ok(index >= 0, 'Failed to find "aws_instance" in test document.');

			editor.selection = new vscode.Selection(
				new vscode.Position(0, index + 1),
				new vscode.Position(0, index + 1),
			);

			await vscode.commands.executeCommand("tfdoc.openDocs");

			assert.deepStrictEqual(errors, []);
			assert.deepStrictEqual(openedUris, [
				"https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance",
			]);
			assert.deepStrictEqual(statusMessages, [
				{
					message: "Opening Terraform docs for aws_instance...",
					timeout: 3000,
				},
			]);
		} finally {
			restoreOpenExternal?.();
			restoreStatusBarMessage?.();
			restoreShowErrorMessage?.();
		}
	});
});
