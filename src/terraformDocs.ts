export type TerraformBlockKind = "resource" | "data-source";

export interface TerraformTarget {
	typeName: string;
	kind: TerraformBlockKind;
	parameter?: string;
}

export function buildTerraformDocsUrl(
	target: TerraformTarget,
): string | undefined {
	const [provider, ...resourceParts] = target.typeName.toLowerCase().split("_");
	if (!provider || resourceParts.length === 0) {
		return undefined;
	}

	const namespace = providerToNamespace(provider);
	const segment = target.kind === "data-source" ? "data-sources" : "resources";
	const resource = resourceParts.join("_");
	const baseUrl = `https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs/${segment}/${resource}`;

	if (!target.parameter) {
		return baseUrl;
	}
	// FIXME: This naive logic of appending a -1 suffix will break for resources/data sources that have multiple parameters with the same name.
	return `${baseUrl}#${target.parameter}-1`;
}

export const DEFAULT_NAMESPACE = "hashicorp";
export const PROVIDER_TO_NAMESPACE: Record<string, string> = {
	okta: "okta",
	datadog: "DataDog",
	docker: "kreuzwerker",
	sakuracloud: "sacloud",
	github: "integrations",
};

export function providerToNamespace(provider: string): string {
	return PROVIDER_TO_NAMESPACE[provider] ?? DEFAULT_NAMESPACE;
}
