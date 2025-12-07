export type TerraformBlockKind = "resource" | "data-source";

export interface TerraformTarget {
	typeName: string;
	kind: TerraformBlockKind;
}

export function buildTerraformDocsUrl(
	target: TerraformTarget,
): string | undefined {
	const lower = target.typeName.toLowerCase();
	const [provider, ...rest] = lower.split("_");
	if (!provider || rest.length === 0) {
		return undefined;
	}

	const resourcePath = rest.join("_");
	const namespace = toNamespace(provider);
	const segment = target.kind === "data-source" ? "data-sources" : "resources";
	return `https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs/${segment}/${resourcePath}`;
}

export const DEFAULT_NAMESPACE = "hashicorp";
export const PROVIDER_TO_NAMESPACE: Record<string, string> = {
	okta: "okta",
	datadog: "DataDog",
	docker: "kreuzwerker",
	sakuracloud: "sacloud",
	github: "integrations",
};

export function toNamespace(provider: string): string {
	return PROVIDER_TO_NAMESPACE[provider] ?? DEFAULT_NAMESPACE;
}
