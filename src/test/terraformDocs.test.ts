import * as assert from "node:assert";
import { buildTerraformDocsUrl, type TerraformTarget } from "../terraformDocs";

suite("Terraform docs helpers", () => {
	test("builds resource URL with default namespace", () => {
		const target: TerraformTarget = {
			typeName: "aws_instance",
			kind: "resource",
		};

		const url = buildTerraformDocsUrl(target);

		assert.strictEqual(
			url,
			"https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance",
		);
	});

	test("builds data source URL with namespace override", () => {
		const target: TerraformTarget = {
			typeName: "datadog_monitor",
			kind: "data-source",
		};

		const url = buildTerraformDocsUrl(target);

		assert.strictEqual(
			url,
			"https://registry.terraform.io/providers/DataDog/datadog/latest/docs/data-sources/monitor",
		);
	});

	test("returns undefined for invalid identifier", () => {
		const invalidTarget: TerraformTarget = {
			typeName: "aws",
			kind: "resource",
		};

		const url = buildTerraformDocsUrl(invalidTarget);

		assert.strictEqual(url, undefined);
	});
});
