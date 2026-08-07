export function downloadKubeconfig(namespace: string, kubeconfig: string) {
  const blob = new Blob([kubeconfig], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${namespace}.kubeconfig.yaml`;
  link.click();
  URL.revokeObjectURL(url);
}
